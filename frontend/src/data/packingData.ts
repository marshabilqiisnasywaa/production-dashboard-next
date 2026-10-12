export type PackingRow = {
  date: string;
  line: string;
  model: string;
  category: string;
  ngDetail: string;
  subProcess: string;
  quantity: number;
};

export type PackingOutputRow = {
  date: string;
  line: string;
  model: string;
  output: number;
};

export const packingTimeOptions = [
  "Yesterday",
  "Today",
  "Last 7 Days",
  "This Month",
  "Custom range",
] as const;

export const packingCategoryOptions = [
  "All",
  "IMEI",
  "Upgrade",
  "Reset Factory",
  "CCD",
  "Cell",
  "Weighing",
  "Auto Cutting",
  "AI Detection Needle",
] as const;

export const packingModelTabs = [
  "ALL",
  "K6070",
  "K6081",
  "K6100",
  "K6200",
  "K5440",
  "K5450",
  "A7600",
] as const;

export const packingStandardMap: Record<string, number> = {
  IMEI: 0.3,
  Upgrade: 0.6,
  "Reset Factory": 0.15,
  CCD: 0.39,
  Cell: 0.16,
  Weighing: 1.4,
  "Auto Cutting": 2.0,
};

export const packingNgRows: PackingRow[] = [
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 18 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 16 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 14 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "IMEI", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "IMEI", quantity: 10 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "CCD", ngDetail: "StickerPudar", subProcess: "CCD", quantity: 7 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Reset Factory", ngDetail: "Notbon", subProcess: "Reset Factory", quantity: 5 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "AI Detection Needle", ngDetail: "GarisPutong", subProcess: "AI Detection Needle", quantity: 4 },

  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 14 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 12 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Upgrade", ngDetail: "GarisPutong", subProcess: "Upgrade", quantity: 11 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "IMEI", ngDetail: "StickerPudar", subProcess: "IMEI", quantity: 8 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "CCD", ngDetail: "PerubahanRange", subProcess: "CCD", quantity: 4 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Reset Factory", ngDetail: "StartGuideKotor", subProcess: "Reset Factory", quantity: 3 },

  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 20 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Weighing", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "Weighing", quantity: 14 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 10 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "IMEI", ngDetail: "KotorBendaAsing", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "CCD", ngDetail: "AATE", subProcess: "CCD", quantity: 5 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Reset Factory", ngDetail: "Notbon", subProcess: "Reset Factory", quantity: 3 },

  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 16 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Weighing", ngDetail: "Uniscan2x", subProcess: "Weighing", quantity: 12 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Upgrade", ngDetail: "ColorboxSobek", subProcess: "Upgrade", quantity: 9 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "IMEI", ngDetail: "FlashingFlag", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "CCD", ngDetail: "ColorboxKotor", subProcess: "CCD", quantity: 5 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Reset Factory", ngDetail: "GarisPutong", subProcess: "Reset Factory", quantity: 2 },

  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 13 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Weighing", ngDetail: "StickerPudar", subProcess: "Weighing", quantity: 11 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Upgrade", ngDetail: "Terlipat", subProcess: "Upgrade", quantity: 12 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "IMEI", ngDetail: "AATE", subProcess: "IMEI", quantity: 7 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "CCD", ngDetail: "PerubahanRange", subProcess: "CCD", quantity: 4 },

  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 12 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Weighing", ngDetail: "StickerPudar", subProcess: "Weighing", quantity: 16 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Upgrade", ngDetail: "SoldePatah", subProcess: "Upgrade", quantity: 13 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "IMEI", ngDetail: "ColorboxPenyok", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "CCD", ngDetail: "Notbon", subProcess: "CCD", quantity: 4 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "AI Detection Needle", ngDetail: "ProtectiveShellT", subProcess: "AI Detection Needle", quantity: 3 },

  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 11 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 8 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 7 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "IMEI", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "IMEI", quantity: 5 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "CCD", ngDetail: "StickerPudar", subProcess: "CCD", quantity: 4 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Reset Factory", ngDetail: "Notbon", subProcess: "Reset Factory", quantity: 2 },

  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 9 },
  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "Weighing", ngDetail: "Uniscan2x", subProcess: "Weighing", quantity: 7 },
  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 5 },
  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "IMEI", ngDetail: "AATE", subProcess: "IMEI", quantity: 4 },
  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "CCD", ngDetail: "ColorboxSobek", subProcess: "CCD", quantity: 3 },
  { date: "2026-10-01", line: "TAC20607", model: "A7600", category: "Reset Factory", ngDetail: "GarisPutong", subProcess: "Reset Factory", quantity: 2 },
] as const;

export const packingOutputRows: PackingOutputRow[] = [
  { date: "2026-09-30", line: "PKC20603", model: "K6070", output: 1658 },
  { date: "2026-09-30", line: "PKC20603", model: "K6081", output: 1643 },
  { date: "2026-09-30", line: "PKC20603", model: "K6100", output: 1638 },
  { date: "2026-09-30", line: "PKC20603", model: "K6200", output: 1622 },
  { date: "2026-09-30", line: "PKC20603", model: "K5440", output: 1608 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", output: 1624 },
  { date: "2026-09-30", line: "PKC20606", model: "K6070", output: 1587 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", output: 1569 },
  { date: "2026-09-30", line: "PKC20606", model: "K6100", output: 1552 },
  { date: "2026-09-30", line: "PKC20606", model: "K6200", output: 1541 },
  { date: "2026-09-30", line: "PKC20606", model: "K5440", output: 1557 },
  { date: "2026-09-30", line: "PKC20606", model: "K5450", output: 1562 },
  { date: "2026-09-30", line: "PKC20607", model: "K6070", output: 1685 },
  { date: "2026-09-30", line: "PKC20607", model: "K6081", output: 1671 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", output: 1649 },
  { date: "2026-09-30", line: "PKC20607", model: "K6200", output: 1643 },
  { date: "2026-09-30", line: "PKC20607", model: "K5440", output: 1637 },
  { date: "2026-09-30", line: "PKC20607", model: "K5450", output: 1629 },
  { date: "2026-09-30", line: "TAC20607", model: "A7600", output: 1622 },
  { date: "2026-09-30", line: "TAC20603", model: "A7600", output: 1611 },
  { date: "2026-09-30", line: "TAC20606", model: "A7600", output: 1588 },
] as const;

export const packingCategoryRateCards = [
  { name: "IMEI", value: 0.37, standard: 0.3, exceedsStandard: true },
  { name: "Upgrade", value: 0.73, standard: 0.6, exceedsStandard: true },
  { name: "Reset Factory", value: 0.13, standard: 0.15, exceedsStandard: false },
  { name: "CCD", value: 0.37, standard: 0.39, exceedsStandard: false },
  { name: "Cell", value: 0.21, standard: 0.16, exceedsStandard: true },
  { name: "Weighing", value: 1.0, standard: 1.4, exceedsStandard: false },
  { name: "Auto Cutting", value: 1.37, standard: 2.0, exceedsStandard: false },
] as const;

export const packingCategoryDonut = [
  { name: "AutoCutting", value: 136 },
  { name: "Weighing", value: 99 },
  { name: "Upgrade", value: 73 },
  { name: "IMEI", value: 37 },
  { name: "CCD", value: 13 },
  { name: "Reset Factory", value: 13 },
  { name: "AI Detection Needle", value: 7 },
] as const;

export const packingDetailBar = [
  { name: "CloseAplikasi", value: 73 },
  { name: "KotorBendaAsing", value: 54 },
  { name: "StickerPudar", value: 37 },
  { name: "TimbanganError", value: 37 },
  { name: "Bolong", value: 33 },
  { name: "Terlipat", value: 28 },
  { name: "BarcodeTidakTerdeteksiScan", value: 26 },
  { name: "Uniscan2x", value: 25 },
  { name: "GarisPutong", value: 21 },
  { name: "NGAplikasi", value: 13 },
  { name: "FlashingFlag", value: 8 },
  { name: "Notbon", value: 6 },
  { name: "PerubahanRange", value: 5 },
  { name: "AATE", value: 5 },
  { name: "ColorboxKotor", value: 2 },
  { name: "StartGuideKotor", value: 1 },
  { name: "ColorboxPenyok", value: 1 },
  { name: "ColorboxSobek", value: 1 },
  { name: "ProtectiveShellT", value: 1 },
  { name: "CPEBox", value: 1 },
] as const;

export const packingTableRows: PackingRow[] = [
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 18 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 16 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 14 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "IMEI", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "IMEI", quantity: 10 },
  { date: "2026-09-30", line: "PKC20603", model: "K6070", category: "CCD", ngDetail: "StickerPudar", subProcess: "CCD", quantity: 7 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 14 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 12 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "Upgrade", ngDetail: "GarisPutong", subProcess: "Upgrade", quantity: 11 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "IMEI", ngDetail: "StickerPudar", subProcess: "IMEI", quantity: 8 },
  { date: "2026-09-30", line: "PKC20606", model: "K6081", category: "CCD", ngDetail: "AATE", subProcess: "CCD", quantity: 4 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 20 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Weighing", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "Weighing", quantity: 14 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 10 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "IMEI", ngDetail: "KotorBendaAsing", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "PKC20607", model: "K6100", category: "CCD", ngDetail: "AATE", subProcess: "CCD", quantity: 5 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 16 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Weighing", ngDetail: "Uniscan2x", subProcess: "Weighing", quantity: 12 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "Upgrade", ngDetail: "ColorboxSobek", subProcess: "Upgrade", quantity: 9 },
  { date: "2026-09-30", line: "PKC20604", model: "K6200", category: "IMEI", ngDetail: "FlashingFlag", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 13 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Weighing", ngDetail: "StickerPudar", subProcess: "Weighing", quantity: 11 },
  { date: "2026-09-30", line: "PKC20604", model: "K5440", category: "Upgrade", ngDetail: "Terlipat", subProcess: "Upgrade", quantity: 12 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 12 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Weighing", ngDetail: "StickerPudar", subProcess: "Weighing", quantity: 16 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 13 },
  { date: "2026-09-30", line: "PKC20603", model: "K5450", category: "IMEI", ngDetail: "ColorboxPenyok", subProcess: "IMEI", quantity: 6 },
  { date: "2026-09-30", line: "TAC20607", model: "A7600", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 9 },
  { date: "2026-09-30", line: "TAC20607", model: "A7600", category: "Weighing", ngDetail: "Uniscan2x", subProcess: "Weighing", quantity: 7 },
  { date: "2026-09-30", line: "TAC20607", model: "A7600", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 5 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Auto Cutting", ngDetail: "CloseAplikasi", subProcess: "Auto Cutting", quantity: 11 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Weighing", ngDetail: "TimbanganError", subProcess: "Weighing", quantity: 8 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "Upgrade", ngDetail: "Bolong", subProcess: "Upgrade", quantity: 7 },
  { date: "2026-09-29", line: "PKC20603", model: "K6070", category: "IMEI", ngDetail: "BarcodeTidakTerdeteksiScan", subProcess: "IMEI", quantity: 5 },
  { date: "2026-10-01", line: "PKC20603", model: "K5450", category: "CCD", ngDetail: "Notbon", subProcess: "CCD", quantity: 4 },
  { date: "2026-10-01", line: "PKC20603", model: "K5450", category: "AI Detection Needle", ngDetail: "ProtectiveShellT", subProcess: "AI Detection Needle", quantity: 3 },
] as const;
