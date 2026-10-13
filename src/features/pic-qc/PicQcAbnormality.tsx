"use client";
import { AbnormalityBoard } from "@/features/pic-repair/PicAbnormality";
import { QC_PIC_NAME, useQcPic } from "@/features/pic-qc/QcPicContext";

export default function PicQcAbnormality() {
  const { records, addRecord } = useQcPic();
  return <AbnormalityBoard records={records} addRecord={addRecord} picName={QC_PIC_NAME} areaOptions={["FQC", "OQC", "ODM"]} />;
}
