import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorkshopTeamTv from "@/features/dm-dashboard/WorkshopTeamTv";

export const metadata: Metadata = { title: "Tim Workshop" };

export default async function Page({
  params,
}: {
  params: Promise<{ workshopId: string }>;
}) {
  const { workshopId } = await params;
  const id = Number(workshopId);
  if (!/^\d+$/.test(workshopId) || !Number.isSafeInteger(id) || id < 1) {
    notFound();
  }
  return <WorkshopTeamTv key={id} workshopId={id} />;
}
