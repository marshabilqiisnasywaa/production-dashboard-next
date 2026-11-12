import type { LucideIcon } from "lucide-react";

export type KpiTone = "neutral" | "danger" | "warning" | "success";

export type KpiCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: KpiTone;
  icon: LucideIcon;
};

const cardTone: Record<KpiTone, string> = {
  neutral: "bg-gradient-to-br! from-slate-50 via-white to-slate-50/50 border border-slate-200/70! rounded-xl! shadow-sm",
  danger: "bg-gradient-to-br! from-red-50/80 via-red-50/20 to-white border border-red-200/60! rounded-xl! shadow-sm",
  warning: "bg-gradient-to-br! from-amber-50/80 via-amber-50/20 to-white border border-amber-200/60! rounded-xl! shadow-sm",
  success: "bg-gradient-to-br! from-emerald-50/80 via-emerald-50/20 to-white border border-emerald-200/60! rounded-xl! shadow-sm",
};

const valueTone: Record<KpiTone, string> = {
  neutral: "text-slate-900 dark:text-slate-100 font-bold!",
  danger: "text-red-600 font-bold!",
  warning: "text-amber-600 font-bold!",
  success: "text-emerald-600 font-bold!",
};

const iconTone: Record<KpiTone, string> = {
  neutral: "text-slate-900 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/50 backdrop-blur-sm",
  danger: "text-red-600 bg-red-100/60 border border-red-200/50 backdrop-blur-sm",
  warning: "text-amber-600 bg-amber-100/60 border border-amber-200/50 backdrop-blur-sm",
  success: "text-emerald-600 bg-emerald-100/60 border border-emerald-200/50 backdrop-blur-sm",
};

export default function KpiCard({ label, value, helper, tone, icon: Icon }: KpiCardProps) {
  return (
    <article className={`sq-kpi ${cardTone[tone]}`}>
      <div className="sq-kpi-head flex justify-between items-start">
        <span>{label}</span>
        <div className={`p-2.5 rounded-xl ${iconTone[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <strong className={valueTone[tone]}>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
