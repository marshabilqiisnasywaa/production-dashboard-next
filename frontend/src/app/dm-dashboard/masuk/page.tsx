import type { Metadata } from "next";
import UserLogin from "@/features/dm-dashboard/account/UserLogin";

export const metadata: Metadata = { title: "Masuk - DM Dashboard" };

export default function Page() {
  return <UserLogin />;
}
