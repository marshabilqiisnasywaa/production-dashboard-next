import type { Metadata } from "next";
import SupervisorDocumentsPage from "@/features/dm-dashboard/supervisor/pages/SupervisorDocumentsPage";

export const metadata: Metadata = { title: "Dokumen 5Why & PDCA" };

export default function Page() {
  return <SupervisorDocumentsPage />;
}
