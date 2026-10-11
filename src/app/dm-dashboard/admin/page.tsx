import type { Metadata } from "next";
import DmAdminPage from "@/features/dm-dashboard/admin/DmAdminPage";

export const metadata: Metadata = {
  title: "Admin DM Dashboard - Pengaturan Lini",
  description: "Pengaturan Workshop, Triangle Team, dan MPV pada Digital Management Dashboard OPPO",
};

export default function Page() {
  return <DmAdminPage />;
}
