export type AssemblyModuleKey = "assembly" | "packaging";

export const ASSEMBLY_MODULES: AssemblyModuleKey[] = ["assembly", "packaging"];

export const ASSEMBLY_LINES = ["PS01", "PS02", "PS03", "PS04", "PS05", "PS06", "PS07"];

export const PACKAGING_LINES = ["Packing Line 1", "Packing Line 2", "Sealing", "Boxing"];

export const ASSEMBLY_LINE_OUTPUT = [6480, 6320, 6550, 5980, 6410, 6290, 5780];

export const ASSEMBLY_LINE_PLAN = [6500, 6500, 6500, 6500, 6500, 6500, 6500];

export const PACKAGING_LINE_OUTPUT = [11200, 11050, 10800, 10562];

export const PACKAGING_LINE_PLAN = [11500, 11500, 11000, 11000];

export const ASSEMBLY_TRENDS = {
  output: [40200, 40800, 41500, 41200, 42100, 42800, 42500, 43100, 43400, 43600, 43500, 43700, 43800, 43820],
  outputPlan: 45000,
  cycleTime: [2.42, 2.38, 2.45, 2.36, 2.4, 2.34, 2.39, 2.33, 2.37, 2.31, 2.35, 2.3, 2.33, 2.28],
  cycleTarget: 2.2,
  packaging: [39800, 40400, 41100, 40900, 41800, 42400, 42200, 42900, 43200, 43400, 43300, 43500, 43600, 43612],
  packagingPlan: 45000,
  sealing: [14100, 14250, 14180, 14320, 14260, 14380, 14310, 14400, 14350, 14420, 14380, 14450, 14410, 14480],
  sealingPlan: 14500,
  boxing: [13200, 13350, 13280, 13420, 13360, 13480, 13410, 13500, 13450, 13520, 13480, 13550, 13580, 13612],
  boxingPlan: 14500,
};
