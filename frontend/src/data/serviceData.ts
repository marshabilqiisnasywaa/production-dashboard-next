export type ServicePageKey =
  | "service-overview"
  | "service-mainboard"
  | "service-battery"
  | "service-external"
  | "service-qualitas";

export type ServicePoint = {
  label: string;
  target: number;
  actual: number;
};

export type ServiceKpiDefinition = {
  id: string;
  label: string;
  target: number;
  unit: "%";
  higherIsBetter: boolean;
  series: ServicePoint[];
};

export type ServicePageDefinition = {
  id: ServicePageKey;
  title: string;
  subtitle: string;
  kpis: ServiceKpiDefinition[];
};

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep"];

const buildSeries = ({
  target,
  actualBase,
  amplitude,
  phase,
  lowerIsBetter,
}: {
  target: number;
  actualBase: number;
  amplitude: number;
  phase: number;
  lowerIsBetter: boolean;
}): ServicePoint[] => {
  const monthSeries = monthLabels.map((label, index) => ({
    label,
    target,
    actual: Number((actualBase + Math.sin((index + phase) * 0.95) * amplitude + (lowerIsBetter ? 0.12 * (index % 3) : 0.09 * (index % 4))).toFixed(2)),
  }));

  const daySeries = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const isFriday = day % 5 === 0;
    const label = isFriday ? `W${36 + Math.floor(day / 5)}` : `9/${day}`;
    const wave = Math.sin((index + phase) * 0.9) * amplitude;
    const adjustment = lowerIsBetter ? 0.18 * (index % 4) : 0.12 * (index % 5);
    const actual = actualBase + wave + adjustment + (isFriday ? 0.08 : 0);

    return {
      label,
      target,
      actual: Number(Math.min(Math.max(actual, 0), 100).toFixed(2)),
    };
  });

  return [...monthSeries, ...daySeries];
};

const buildFlatSeries = ({
  target,
  actual = 0,
}: {
  target: number;
  actual?: number;
}): ServicePoint[] => {
  const monthSeries = monthLabels.map((label) => ({ label, target, actual }));
  const daySeries = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const isFriday = day % 5 === 0;
    return {
      label: isFriday ? `W${36 + Math.floor(day / 5)}` : `9/${day}`,
      target,
      actual,
    };
  });

  return [...monthSeries, ...daySeries];
};

const mainboardServiceRate: ServicePageDefinition = {
  id: "service-mainboard",
  title: "Mainboard Service Rate",
  subtitle: "Monitoring penyediaan dan hasil perbaikan mainboard",
  kpis: [
    {
      id: "input-rate-pcb",
      label: "Input Rate PCB + WP PCB",
      target: 2.0,
      unit: "%",
      higherIsBetter: false,
      series: buildSeries({ target: 2.0, actualBase: 1.35, amplitude: 0.45, phase: 1, lowerIsBetter: true }),
    },
    {
      id: "pass-rate-repair-pcb",
      label: "Pass Rate Repair PCB",
      target: 96.0,
      unit: "%",
      higherIsBetter: true,
      series: buildSeries({ target: 96.0, actualBase: 97.05, amplitude: 1.5, phase: 2, lowerIsBetter: false }),
    },
    {
      id: "pass-rate-penggunaan-ic",
      label: "Pass Rate Penggunaan IC",
      target: 98.0,
      unit: "%",
      higherIsBetter: true,
      series: buildSeries({ target: 98.0, actualBase: 98.6, amplitude: 1.15, phase: 3, lowerIsBetter: false }),
    },
    {
      id: "pass-rate-penggunaan-pcb",
      label: "Pass rate Penggunaan PCB",
      target: 97.0,
      unit: "%",
      higherIsBetter: true,
      series: buildSeries({ target: 97.0, actualBase: 97.8, amplitude: 1.1, phase: 4, lowerIsBetter: false }),
    },
  ],
};

const batteryServiceRate: ServicePageDefinition = {
  id: "service-battery",
  title: "Battery Service Rate",
  subtitle: "Monitoring input, repair, dan QA battery",
  kpis: [
    {
      id: "input-rate-battery",
      label: "Input Rate Battery + WIP Battery",
      target: 2.0,
      unit: "%",
      higherIsBetter: false,
      series: buildSeries({ target: 2.0, actualBase: 1.4, amplitude: 0.52, phase: 5, lowerIsBetter: true }),
    },
    {
      id: "pass-rate-repair-battery",
      label: "Pass Rate Repair Battery",
      target: 98.0,
      unit: "%",
      higherIsBetter: true,
      series: buildSeries({ target: 98.0, actualBase: 98.9, amplitude: 0.9, phase: 6, lowerIsBetter: false }),
    },
    {
      id: "pass-rate-qa-battery",
      label: "Pass Rate QA Battery",
      target: 98.0,
      unit: "%",
      higherIsBetter: true,
      series: buildFlatSeries({ target: 98.0, actual: 0 }),
    },
  ],
};

const serviceExternal: ServicePageDefinition = {
  id: "service-external",
  title: "Service External",
  subtitle: "Monitoring penanganan material dan analisa eksternal",
  kpis: [
    {
      id: "pemberesan-material",
      label: "Pemberesan Material",
      target: 2.2,
      unit: "%",
      higherIsBetter: false,
      series: buildSeries({ target: 2.2, actualBase: 1.9, amplitude: 0.48, phase: 8, lowerIsBetter: true }),
    },
    {
      id: "pembongkaran-rate",
      label: "Pembongkaran Rate",
      target: 90.0,
      unit: "%",
      higherIsBetter: true,
      series: buildSeries({ target: 90.0, actualBase: 92.2, amplitude: 2.1, phase: 9, lowerIsBetter: false }),
    },
    {
      id: "misjudge-analisa",
      label: "Misjudge Analisa",
      target: 1.5,
      unit: "%",
      higherIsBetter: false,
      series: buildSeries({ target: 1.5, actualBase: 1.1, amplitude: 0.34, phase: 10, lowerIsBetter: true }),
    },
  ],
};

const qualitas: ServicePageDefinition = {
  id: "service-qualitas",
  title: "Qualitas",
  subtitle: "Monitoring masalah kualitas eksternal dan internal",
  kpis: [
    {
      id: "masalah-qualitas",
      label: "Masalah Qualitas",
      target: 1.8,
      unit: "%",
      higherIsBetter: false,
      series: buildSeries({ target: 1.8, actualBase: 1.4, amplitude: 0.42, phase: 12, lowerIsBetter: true }),
    },
  ],
};

export const servicePages: Record<ServicePageKey, ServicePageDefinition> = {
  "service-overview": {
    id: "service-overview",
    title: "Service Overview",
    subtitle: "Ringkasan performa layanan produk dan reparasi",
    kpis: [],
  },
  "service-mainboard": mainboardServiceRate,
  "service-battery": batteryServiceRate,
  "service-external": serviceExternal,
  "service-qualitas": qualitas,
};

export const serviceOverviewGroups = [
  {
    id: "service-mainboard" as const,
    title: "Mainboard Service Rate",
    subtitle: "PCB + WP PCB",
    kpis: mainboardServiceRate.kpis.slice(0, 4).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.series[item.series.length - 1]?.actual ?? 0,
      target: item.target,
    })),
  },
  {
    id: "service-battery" as const,
    title: "Battery Service Rate",
    subtitle: "Battery repair & QA",
    kpis: batteryServiceRate.kpis.slice(0, 3).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.series[item.series.length - 1]?.actual ?? 0,
      target: item.target,
    })),
  },
  {
    id: "service-external" as const,
    title: "Service External",
    subtitle: "Pemberesan & analisa",
    kpis: serviceExternal.kpis.slice(0, 3).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.series[item.series.length - 1]?.actual ?? 0,
      target: item.target,
    })),
  },
  {
    id: "service-qualitas" as const,
    title: "Qualitas",
    subtitle: "Masalah quality",
    kpis: qualitas.kpis.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.series[item.series.length - 1]?.actual ?? 0,
      target: item.target,
    })),
  },
];
