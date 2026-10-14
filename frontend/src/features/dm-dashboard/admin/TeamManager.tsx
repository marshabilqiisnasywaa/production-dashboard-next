"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api";
import type { DmLine, DmMemberInput } from "../api";
import type { DmMember } from "../dmData";
import MemberEditor from "./MemberEditor";

interface TeamManagerProps {
  line: DmLine;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onChanged: () => Promise<void>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export default function TeamManager({ line, call, onChanged }: TeamManagerProps) {
  const [members, setMembers] = useState<DmMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [newKey, setNewKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setMembers(await call(() => adminApi.members(line.id)));
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [call, line.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function afterChange(message: string) {
    setStatus(message);
    await Promise.all([load(), onChanged()]);
  }

  async function add(input: DmMemberInput) {
    await call(() => adminApi.addMember(line.id, input));
    setNewKey((n) => n + 1);
    await afterChange(`${input.name} ditambahkan ke tim.`);
  }

  async function save(member: DmMember, input: DmMemberInput) {
    if (member.id === undefined) return;
    const memberId = member.id;
    await call(() => adminApi.updateMember(memberId, input));
    await afterChange(`Data ${input.name} disimpan.`);
  }

  async function release(member: DmMember) {
    if (member.id === undefined) return;
    const memberId = member.id;
    if (!window.confirm(`Lepas ${member.name ?? "anggota ini"} dari lini ${line.code}? Orangnya bisa dipasang ke lini lain setelah ini.`)) {
      return;
    }
    await call(() => adminApi.releaseMember(memberId));
    await afterChange(`${member.name ?? "Anggota"} dilepas dari lini.`);
  }

  return (
    <div className="dm-modal-sec-container">
      <p className="dm-admin-team-intro">
        Anggota tim lini {line.code} tampil di dashboard sesuai nomor urutan. Satu orang hanya bisa aktif di satu lini.
        Link dashboard: <strong>/dm-dashboard/{line.slug}</strong>
      </p>
      <div role="status" className="dm-admin-team-status">{status}</div>

      {loading && members.length === 0 ? (
        <p role="status">Memuat anggota...</p>
      ) : loadError ? (
        <div className="dm-admin-state-block">
          <p role="alert">{loadError}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={load}>Coba lagi</button>
        </div>
      ) : (
        <div className="dm-admin-member-grid">
          {members.map((member, index) => (
            <MemberEditor
              key={`${line.id}-${member.id}`}
              idPrefix={`member-${member.id}`}
              title={`Anggota ${index + 1}`}
              member={member}
              defaultSortOrder={index + 1}
              saveLabel="Simpan"
              onSave={(input) => save(member, input)}
              onRelease={() => release(member)}
            />
          ))}
          <MemberEditor
            key={`${line.id}-new-${newKey}`}
            idPrefix="member-new"
            title={members.length === 0 ? "Anggota pertama" : "Anggota baru"}
            defaultSortOrder={members.length + 1}
            saveLabel="Tambah ke Tim"
            onSave={add}
          />
        </div>
      )}
    </div>
  );
}
