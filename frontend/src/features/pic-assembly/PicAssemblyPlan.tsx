"use client";
import PicPlan from "@/features/pic-repair/PicPlan";
import { ASSEMBLY_PIC_NAME } from "@/features/pic-assembly/AssemblyPicContext";
import { addAssemblyPlan, deleteAssemblyPlan, updateAssemblyPlan, useAssemblyPlans } from "@/features/pic-assembly/assemblyPlanStore";

export default function PicAssemblyPlan() {
  const plans = useAssemblyPlans();
  return <PicPlan plans={plans} picName={ASSEMBLY_PIC_NAME} addPlan={addAssemblyPlan} updatePlan={updateAssemblyPlan} deletePlan={deleteAssemblyPlan} />;
}
