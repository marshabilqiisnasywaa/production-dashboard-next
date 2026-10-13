"use client";
import PicPlan from "@/features/pic-repair/PicPlan";
import { SERVICE_PIC_NAME } from "@/features/pic-service/ServicePicContext";
import { addServicePlan, deleteServicePlan, updateServicePlan, useServicePlans } from "@/features/pic-service/servicePlanStore";

export default function PicServicePlan() {
  const plans = useServicePlans();
  return <PicPlan plans={plans} picName={SERVICE_PIC_NAME} addPlan={addServicePlan} updatePlan={updateServicePlan} deletePlan={deleteServicePlan} />;
}
