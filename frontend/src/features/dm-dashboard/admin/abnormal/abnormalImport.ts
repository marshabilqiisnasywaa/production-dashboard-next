import type { DmAbnormalImportInput } from "../../api";
import { readWorkbook } from "../UserImport";

const GREEN = "#046A38";
const MUTED = "#5B6E63";
const HEADER_SCAN_ROWS = 20;
const MAX_CODE1 = 2000;
const MAX_CODE2 = 2000;
const MAX_CODE3 = 5000;

function cellText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function columnOf(row: unknown[], level: number) {
  const pattern = new RegExp(`^code\\s*${level}$`, "i");
  return row.findIndex((cell) => pattern.test(cellText(cell)));
}

export async function readCategoryColumns(
  file: File
): Promise<DmAbnormalImportInput> {
  const table = await readWorkbook(file);
  let headerRow = -1;
  let columns = [-1, -1, -1];
  for (let index = 0; index < Math.min(table.length, HEADER_SCAN_ROWS); index += 1) {
    const found = [1, 2, 3].map((level) => columnOf(table[index], level));
    if (found.some((column) => column >= 0)) {
      headerRow = index;
      columns = found;
      break;
    }
  }
  if (headerRow < 0) columns = [0, 1, 2];

  const pick = (column: number) =>
    column < 0
      ? []
      : table
          .slice(headerRow + 1)
          .map((row) => cellText(row[column]))
          .filter(Boolean);

  const input: DmAbnormalImportInput = {
    code1: pick(columns[0]),
    code2: pick(columns[1]),
    code3: pick(columns[2]),
  };
  if (input.code1.length + input.code2.length + input.code3.length === 0) {
    throw new Error(
      "Tidak ada isi yang terbaca. Pastikan kolom berjudul Code 1, Code 2, dan Code 3."
    );
  }
  if (
    input.code1.length > MAX_CODE1 ||
    input.code2.length > MAX_CODE2 ||
    input.code3.length > MAX_CODE3
  ) {
    throw new Error("Isi file terlalu banyak untuk satu kali impor.");
  }
  return input;
}

export async function downloadCategoryTemplate() {
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
  const guide = [
    ["Kolom", "Isi sel", "Contoh"].map(head),
    [
      { value: "Code 1", fontWeight: "bold" as const, alignVertical: "top" as const },
      { value: "KODE-Nama. Kode satu huruf.", wrap: true, alignVertical: "top" as const },
      { value: "P-Planning Losses", textColor: MUTED, alignVertical: "top" as const },
    ],
    [
      { value: "Code 2", fontWeight: "bold" as const, alignVertical: "top" as const },
      { value: "KODE-Nama. Kode diawali kode Code 1 induknya.", wrap: true, alignVertical: "top" as const },
      { value: "P01-Ramp Up Losses", textColor: MUTED, alignVertical: "top" as const },
    ],
    [
      { value: "Code 3", fontWeight: "bold" as const, alignVertical: "top" as const },
      { value: "KODE-Nama. Kode diawali kode Code 2 induknya.", wrap: true, alignVertical: "top" as const },
      { value: "P01-01-New Operator", textColor: MUTED, alignVertical: "top" as const },
    ],
    [
      { value: "Hubungan", fontWeight: "bold" as const, alignVertical: "top" as const },
      {
        value:
          "Induk dibaca dari kode, bukan dari posisi baris. Tiap kolom boleh punya jumlah baris berbeda.",
        wrap: true,
        alignVertical: "top" as const,
      },
      { value: "P01-01 milik P01, P01 milik P", textColor: MUTED, alignVertical: "top" as const },
    ],
  ];
  const blank = [1, 2, 3].map(() => ({ type: String, value: "", format: "@" }));
  const blob = await writeExcelFile(
    [
      {
        data: [
          [head("Code 1"), head("Code 2"), head("Code 3")],
          ...Array.from({ length: 300 }, () => blank),
        ],
        sheet: "Kategori Abnormal",
        columns: [{ width: 34 }, { width: 38 }, { width: 44 }],
        stickyRowsCount: 1,
      },
      {
        data: guide,
        sheet: "Petunjuk",
        columns: [{ width: 14 }, { width: 62 }, { width: 34 }],
      },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-kategori-abnormal.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
