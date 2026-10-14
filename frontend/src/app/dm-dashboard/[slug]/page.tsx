import type { Metadata } from "next";
import DmDashboard from "@/features/dm-dashboard/DmDashboard";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "DM Dashboard" };

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <DmDashboard slug={slug} />;
}
