"use client";
import { AbnormalityBoard } from "@/features/pic-repair/PicAbnormality";
import { COST_PIC_NAME, useCostPic } from "@/features/cost/CostPicContext";

export default function PicCostAbnormality() {
  const { records, addRecord } = useCostPic();
  return <AbnormalityBoard records={records} addRecord={addRecord} picName={COST_PIC_NAME} areaOptions={["Overtime & Hours", "Direct / Indirect Labor", "Losses & Scrap", "Material Transfer", "Idle Time & Downtime", "Project Improvement"]} />;
}
