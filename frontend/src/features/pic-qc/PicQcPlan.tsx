"use client";
import PicPlan from "@/features/pic-repair/PicPlan";
import { QC_PIC_NAME } from "@/features/pic-qc/QcPicContext";
import { addQcPlan, deleteQcPlan, updateQcPlan, useQcPlans } from "@/features/pic-qc/qcPlanStore";

export default function PicQcPlan() {
  const plans = useQcPlans();
  return <PicPlan plans={plans} picName={QC_PIC_NAME} addPlan={addQcPlan} updatePlan={updateQcPlan} deletePlan={deleteQcPlan} />;
}
