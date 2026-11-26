"use client";
import { FollowupBoard } from "@/features/pic-repair/PicRepairFollowup";
import { useSafetyPic } from "@/features/safety/SafetyPicContext";

export default function PicSafetyFollowup() {
  const { records, updateRecord } = useSafetyPic();
  return <FollowupBoard records={records} updateRecord={updateRecord} sourceLabel="Safety Abnormality Log" />;
}
