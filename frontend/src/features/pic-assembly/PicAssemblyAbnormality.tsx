"use client";
import { AbnormalityBoard } from "@/features/pic-repair/PicAbnormality";
import { ASSEMBLY_PIC_NAME, useAssemblyPic } from "@/features/pic-assembly/AssemblyPicContext";

export default function PicAssemblyAbnormality() {
  const { records, addRecord } = useAssemblyPic();
  return <AbnormalityBoard records={records} addRecord={addRecord} picName={ASSEMBLY_PIC_NAME} areaOptions={["Main Assembly Line (PS01 - PS07)", "Pre-Assembly / Sub-Assembly", "Packaging & Labeling Line", "Cushioning & Boxing Area", "Buffer / Material Feeder Line"]} />;
}
