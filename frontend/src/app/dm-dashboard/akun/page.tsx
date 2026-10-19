import type { Metadata } from "next";
import AccountPage from "@/features/dm-dashboard/account/AccountPage";

export const metadata: Metadata = { title: "Akun Saya - DM Dashboard" };

export default function Page() {
  return <AccountPage />;
}
