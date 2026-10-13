"use client";
import { FollowupBoard } from "@/features/pic-repair/PicRepairFollowup";
import { useServicePic } from "@/features/pic-service/ServicePicContext";

export default function PicServiceFollowup() {
  const { records, updateRecord } = useServicePic();
  return <FollowupBoard records={records} updateRecord={updateRecord} sourceLabel="Service Abnormality Log" />;
}
