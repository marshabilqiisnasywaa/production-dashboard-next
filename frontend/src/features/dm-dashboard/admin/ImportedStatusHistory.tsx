"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { historyImportApi, type DmHistoryStoredRow } from "../api";
import { formatDate } from "../leader/log/utils";
import { HistoryChip, HistoryPager } from "./HistoryParts";
import { importedStatusLabel, importedStatusRows } from "./importedStatusRows";

const PAGE_SIZE = 10;

export default function ImportedStatusHistory({
  from,
  to,
  line,
  kind,
  search,
  shift,
  refresh,
  call,
}: {
  from: string;
  to: string;
  line?: string;
  kind: "papercard_status" | "attendance";
  search: string;
  shift?: string;
  refresh: number;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  const { text: uiText, locale } = useUiText();
  const [rows, setRows] = useState<DmHistoryStoredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const attendance = kind === "attendance";
  const roles = attendance
    ? ["Leader", "ME", "PE Structure", "PE Electric", "QA"]
    : ["Leader", "ME", "PE", "IPQC"];

  useEffect(() => {
    const refresh = () => setReload((value) => value + 1);
    window.addEventListener("dm-history-imported", refresh);
    return () => window.removeEventListener("dm-history-imported", refresh);
  }, []);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let active = true;
    setLoading(true);
    setError(null);
    call(() => historyImportApi.statuses({ from, to, line, kind }))
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((cause) => {
        if (active) {
          setRows([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Histori Excel gagal dimuat."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, line, kind, refresh, reload, call]);

  useEffect(() => {
    setPage(1);
  }, [from, to, line, kind, search, shift, refresh, reload]);

  const visible = useMemo(
    () => importedStatusRows(rows, attendance, search, shift),
    [rows, attendance, search, shift]
  );
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  );
  void uiText;
  void locale;
  void roles;
  void loading;
  void error;
  void safePage;
  return null;
}
