const ALIASES: Record<string, string> = {
  PROD: "PROD",
  PRODUKSI: "PROD",
  QC: "QC",
  QA: "QC",
  QUALITY: "QC",
  "QUALITY CONTROL": "QC",
};

const LABELS: Record<string, string> = {
  PROD: "Produksi",
  QC: "Quality",
};

export function normalizeDepartment(value: string | null | undefined): string {
  const text = (value ?? "").trim().toUpperCase();
  return ALIASES[text] ?? text;
}

export function departmentLabel(value: string | null | undefined): string {
  return LABELS[normalizeDepartment(value)] ?? (value ?? "").trim();
}

export function labelWithDepartment(label: string, department: string | null | undefined): string {
  const name = departmentLabel(department);
  return name && name !== label ? `${label} (${name})` : label;
}
