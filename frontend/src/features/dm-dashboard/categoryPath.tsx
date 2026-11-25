"use client";
import { useUiText } from "@/locales/useUiText";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { abnormalCategoryApi } from "./api";
import type { DmAbnormalCategory } from "./api";

function byCode(a: DmAbnormalCategory, b: DmAbnormalCategory) {
  return a.code.localeCompare(b.code, "en", { numeric: true });
}

function optionLabel(row: DmAbnormalCategory) {
  return `${row.code} · ${row.name}`;
}

export function useCategoryOptions(enabled = true) {
  const [options, setOptions] = useState<DmAbnormalCategory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(() => {
    setFailed(false);
    abnormalCategoryApi
      .options()
      .then(setOptions)
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  return { options, failed, reload };
}

export type CategoryFieldRenderer = (
  label: string,
  htmlFor: string,
  control: ReactNode
) => ReactNode;

export function CategoryPathSelect({
  id,
  value,
  options,
  invalid,
  disabled = false,
  className,
  selectClassName,
  renderField,
  onChange,
}: {
  id: string;
  value: string[];
  options: DmAbnormalCategory[] | null;
  invalid: boolean;
  disabled?: boolean;
  className: string;
  selectClassName: string;
  renderField: CategoryFieldRenderer;
  onChange: (value: string[]) => void;
}) {
  const { text: uiText } = useUiText();
  const all = options ?? [];
  const code1 = value[0] ?? "";
  const code2 = value[1] ?? "";
  const code3 = value[2] ?? "";
  const level1 = all.filter((row) => row.level === 1).sort(byCode);
  const picked1 = level1.find((row) => row.code === code1);
  const sharedBranches = all.filter(
    (row) => row.level === 2 && row.parentId === null
  );
  const level2 = picked1
    ? [
        ...all.filter((row) => row.level === 2 && row.parentId === picked1.id),
        ...sharedBranches,
      ].sort(byCode)
    : [];
  const picked2 = level2.find((row) => row.code === code2);
  const sharedIds = new Set(sharedBranches.map((row) => row.id));
  const level3 = picked2
    ? Array.from(
        new Map(
          all
            .filter(
              (row) =>
                row.level === 3 &&
                (row.parentId === picked2.id ||
                  (row.parentId !== null && sharedIds.has(row.parentId)))
            )
            .map((row) => [row.id, row])
        ).values()
      ).sort(byCode)
    : [];
  const loading = options === null;

  function pick(level: 1 | 2 | 3, next: string) {
    const current = [code1, code2, code3];
    current[level - 1] = next;
    for (let index = level; index < 3; index += 1) current[index] = "";
    while (current.length && !current[current.length - 1]) current.pop();
    onChange(current);
  }

  return (
    <div className={className}>
      {renderField(
        uiText("Code 1 (wajib)"),
        `${id}-1`,
        <select
          id={`${id}-1`}
          className={selectClassName}
          value={code1}
          disabled={disabled || loading}
          aria-invalid={invalid}
          aria-required="true"
          onChange={(event) => pick(1, event.target.value)}
        >
          <option value="">
            {loading ? uiText("Memuat kategori...") : uiText("Pilih Code 1")}
          </option>
          {level1.map((row) => (
            <option key={row.id} value={row.code}>
              {optionLabel(row)}
            </option>
          ))}
        </select>
      )}
      {renderField(
        uiText("Code 2 (opsional)"),
        `${id}-2`,
        <select
          id={`${id}-2`}
          className={selectClassName}
          value={code2}
          disabled={disabled || loading || !picked1}
          onChange={(event) => pick(2, event.target.value)}
        >
          <option value="">{uiText("Tidak dipilih")}</option>
          {level2.map((row) => (
            <option key={row.id} value={row.code}>
              {optionLabel(row)}
            </option>
          ))}
        </select>
      )}
      {renderField(
        uiText("Code 3 (opsional)"),
        `${id}-3`,
        <select
          id={`${id}-3`}
          className={selectClassName}
          value={code3}
          disabled={disabled || loading || !picked2}
          onChange={(event) => pick(3, event.target.value)}
        >
          <option value="">{uiText("Tidak dipilih")}</option>
          {level3.map((row) => (
            <option key={row.id} value={row.code}>
              {optionLabel(row)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
