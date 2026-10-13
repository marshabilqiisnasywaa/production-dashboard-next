"use client";
import { AbnormalityBoard } from "@/features/pic-repair/PicAbnormality";
import { SERVICE_PIC_NAME, useServicePic } from "@/features/pic-service/ServicePicContext";

export default function PicServiceAbnormality() {
  const { records, addRecord } = useServicePic();
  return <AbnormalityBoard records={records} addRecord={addRecord} picName={SERVICE_PIC_NAME} areaOptions={["Mainboard Service", "Battery Service", "Service External"]} />;
}
