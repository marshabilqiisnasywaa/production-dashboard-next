import type { Metadata } from "next";
import LegacyWorkshopRedirect from "@/features/dm-dashboard/LegacyWorkshopRedirect";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Struktur Tim DM" };

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <LegacyWorkshopRedirect slug={slug} />;
}
