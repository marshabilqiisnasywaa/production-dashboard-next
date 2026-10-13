"use client";
import { FollowupBoard } from "@/features/pic-repair/PicRepairFollowup";
import { useAssemblyPic } from "@/features/pic-assembly/AssemblyPicContext";

export default function PicAssemblyFollowup() {
  const { records, updateRecord } = useAssemblyPic();
  return <FollowupBoard records={records} updateRecord={updateRecord} sourceLabel="Assembly Abnormality Log" />;
}
