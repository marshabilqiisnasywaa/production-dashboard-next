"use client";
import { AbnormalityBoard } from "@/features/pic-repair/PicAbnormality";
import { SAFETY_PIC_NAME, useSafetyPic } from "@/features/safety/SafetyPicContext";

export default function PicSafetyAbnormality() {
  const { records, addRecord } = useSafetyPic();
  return <AbnormalityBoard records={records} addRecord={addRecord} picName={SAFETY_PIC_NAME} areaOptions={["Safety Battery", "Safety Incident", "Safety Information", "Safety Material"]} />;
}
