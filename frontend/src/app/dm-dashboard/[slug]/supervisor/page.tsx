import type { Metadata } from "next";
import DmSupervisorDashboard from "@/features/dm-dashboard/DmDashboardSupervisor";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Struktur Tim DM" };

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <DmSupervisorDashboard slug={slug} />;
}
