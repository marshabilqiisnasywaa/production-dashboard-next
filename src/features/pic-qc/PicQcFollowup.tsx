"use client";
import { FollowupBoard } from "@/features/pic-repair/PicRepairFollowup";
import { useQcPic } from "@/features/pic-qc/QcPicContext";

export default function PicQcFollowup() {
  const { records, updateRecord } = useQcPic();
  return <FollowupBoard records={records} updateRecord={updateRecord} sourceLabel="QC Abnormality Log" />;
}
