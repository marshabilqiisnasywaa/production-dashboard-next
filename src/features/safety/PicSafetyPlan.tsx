"use client";
import PicPlan from "@/features/pic-repair/PicPlan";
import { SAFETY_PIC_NAME } from "@/features/safety/SafetyPicContext";
import { addSafetyPlan, deleteSafetyPlan, updateSafetyPlan, useSafetyPlans } from "@/features/safety/safetyPlanStore";

export default function PicSafetyPlan() {
  const plans = useSafetyPlans();
  return <PicPlan plans={plans} picName={SAFETY_PIC_NAME} addPlan={addSafetyPlan} updatePlan={updateSafetyPlan} deletePlan={deleteSafetyPlan} />;
}
