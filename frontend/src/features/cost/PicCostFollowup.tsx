"use client";
import { FollowupBoard } from "@/features/pic-repair/PicRepairFollowup";
import { useCostPic } from "@/features/cost/CostPicContext";

export default function PicCostFollowup() {
  const { records, updateRecord } = useCostPic();
  return <FollowupBoard records={records} updateRecord={updateRecord} sourceLabel="Cost Abnormality Log" />;
}
