import type { Metadata } from "next";
import MemberPapercardPage from "@/features/dm-dashboard/member/papercard/MemberPapercardPage";

export const metadata: Metadata = {
  title: "Papercard Anggota PE · DM Digital",
};

export default function Page() {
  return <MemberPapercardPage />;
}
