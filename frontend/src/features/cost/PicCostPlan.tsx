"use client";
import PicPlan from "@/features/pic-repair/PicPlan";
import { COST_PIC_NAME } from "@/features/cost/CostPicContext";
import { addCostPlan, deleteCostPlan, updateCostPlan, useCostPlans } from "@/features/cost/costPlanStore";

export default function PicCostPlan() {
  const plans = useCostPlans();
  return <PicPlan plans={plans} picName={COST_PIC_NAME} addPlan={addCostPlan} updatePlan={updateCostPlan} deletePlan={deleteCostPlan} />;
}
