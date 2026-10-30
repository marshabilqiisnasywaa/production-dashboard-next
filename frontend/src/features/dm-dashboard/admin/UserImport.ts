import { dmDepartments, dmEmployeeRoles } from "../api";
import type { DmEmployee, DmEmployeeInput } from "../api";

export type ImportRow = {
  line: number;
  input: DmEmployeeInput;
  supervisorNik: string | null;
  errors: string[];
};

const MAX_ROWS = 500;

const GREEN = "#007A3F";
const MUTED = "#5B6E63";

const templateColumns = [
  {
    key: "nik",
    width: 16,
    text: true,
    rule: "Wajib. Nomor induk karyawan, tidak boleh sama dengan User lain.",
    example: "1001",
  },
  {
    key: "nama",
    width: 28,
    text: false,
    rule: "Wajib. Nama lengkap.",
    example: "Nama lengkap",
  },
  {
    key: "role",
    width: 14,
    text: false,
    rule: "member, leader, atau supervisor. Kosong dianggap member.",
    example: "member",
  },
  {
    key: "departemen",
    width: 14,
    text: false,
    rule: `${dmDepartments.join(", ")}.`,
    example: "PROD",
  },
  {
    key: "position",
    width: 24,
    text: false,
    rule: "Posisi DI team ini.",
    example: "PE Structurel / PE Technician",
  },
  {
    key: "supervisor_nik",
    width: 18,
    text: true,
    rule: "Opsional. NIK supervisor yang sudah terdaftar, atau yang ada di file ini.",
    example: "1001",
  },
  {
    key: "work_phone",
    width: 18,
    text: true,
    rule: "Opsional. Nomor kontak kerja.",
    example: "08xxxxxxxxxx",
  },
];

export async function readWorkbook(file: File): Promise<unknown[][]> {
  const { readSheet } = await import("read-excel-file/universal");
  return readSheet(file);
}

export async function downloadTemplate() {
  const { default: writeExcelFile } = await import(
    "write-excel-file/universal"
  );
  const head = (value: string) => ({
    value,
    fontWeight: "bold" as const,
    textColor: "#FFFFFF",
    backgroundColor: GREEN,
    alignVertical: "center" as const,
    indent: 1,
    height: 24,
  });
  const blankRow = templateColumns.map((column) =>
    column.text ? { type: String, value: "", format: "@" } : null
  );
  const userSheet = [
    templateColumns.map((column) => head(column.key)),
    ...Array.from({ length: MAX_ROWS }, () => blankRow),
  ];
  const guideSheet = [
    ["Kolom", "Aturan", "Contoh"].map(head),
    ...templateColumns.map((column) => [
      {
        value: column.key,
        fontWeight: "bold" as const,
        alignVertical: "top" as const,
      },
      { value: column.rule, wrap: true, alignVertical: "top" as const },
      {
        value: column.example,
        textColor: MUTED,
        alignVertical: "top" as const,
      },
    ]),
  ];
  const blob = await writeExcelFile(
    [
      {
        data: userSheet,
        sheet: "User",
        columns: templateColumns.map((column) => ({ width: column.width })),
        stickyRowsCount: 1,
      },
      {
        data: guideSheet,
        sheet: "Petunjuk",
        columns: [{ width: 18 }, { width: 62 }, { width: 18 }],
      },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-user.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function buildRows(
  table: unknown[][],
  existing: DmEmployee[]
): ImportRow[] {
  const [header, ...body] = table;
  if (!header) throw new Error("File kosong.");
  const index = new Map(header.map((name, i) => [text(name).toLowerCase(), i]));
  for (const name of ["nik", "nama"]) {
    if (!index.has(name))
      throw new Error(`Kolom "${name}" tidak ada di baris pertama.`);
  }
  const lines = body
    .map((raw, i) => ({ raw, line: i + 2 }))
    .filter(({ raw }) => raw.some((value) => text(value) !== ""));
  if (lines.length === 0) throw new Error("Tidak ada baris data.");
  if (lines.length > MAX_ROWS)
    throw new Error(`Maksimal ${MAX_ROWS} baris per import.`);

  const cell = (row: unknown[], name: string) => {
    const i = index.get(name);
    return i === undefined ? "" : text(row[i]);
  };
  const taken = new Set(existing.map((user) => user.employeeId));
  const seen = new Set<string>();

  const rows: ImportRow[] = lines.map(({ raw, line }) => {
    const errors: string[] = [];
    const nik = cell(raw, "nik");
    const name = cell(raw, "nama");
    const roleText = cell(raw, "role").toLowerCase();
    const deptText = cell(raw, "departemen");

    if (!nik) errors.push("NIK kosong.");
    else if (nik.length > 32) errors.push("NIK lebih dari 32 karakter.");
    else if (taken.has(nik)) errors.push("NIK sudah terdaftar.");
    else if (seen.has(nik)) errors.push("NIK dobel di file ini.");
    if (nik) seen.add(nik);

    if (!name) errors.push("Nama kosong.");
    else if (name.length > 120) errors.push("Nama lebih dari 120 karakter.");

    const role = roleText
      ? dmEmployeeRoles.find(
          (item) =>
            item.value === roleText || item.label.toLowerCase() === roleText
        )
      : dmEmployeeRoles[0];
    if (!role) errors.push(`Role "${roleText}" tidak dikenal.`);

    let dept: string | null = null;
    if (deptText) {
      dept =
        dmDepartments.find(
          (item) => item.toLowerCase() === deptText.toLowerCase()
        ) ?? null;
      if (!dept) errors.push(`Departemen "${deptText}" tidak dikenal.`);
    }

    const position = cell(raw, "position");
    const phone = cell(raw, "work_phone");
    if (position.length > 120) errors.push("Position lebih dari 120 karakter.");
    if (phone.length > 32) errors.push("Work phone lebih dari 32 karakter.");

    return {
      line,
      input: {
        employeeId: nik,
        name,
        role: role?.value ?? "member",
        dept,
        position: position || null,
        workPhone: phone || null,
        photoUrl: null,
      },
      supervisorNik: cell(raw, "supervisor_nik") || null,
      errors,
    };
  });

  const activeSupervisors = new Set(
    existing
      .filter((user) => user.role === "supervisor" && user.isActive)
      .map((user) => user.employeeId)
  );
  const fileSupervisors = new Set(
    rows
      .filter((r) => r.input.role === "supervisor" && r.errors.length === 0)
      .map((r) => r.input.employeeId)
  );
  for (const row of rows) {
    if (!row.supervisorNik) continue;
    if (row.input.role === "supervisor") {
      row.errors.push("Supervisor tidak punya supervisor.");
      row.supervisorNik = null;
    } else if (
      !activeSupervisors.has(row.supervisorNik) &&
      !fileSupervisors.has(row.supervisorNik)
    ) {
      row.errors.push(`Supervisor ${row.supervisorNik} tidak ditemukan.`);
    }
  }
  return rows;
}
