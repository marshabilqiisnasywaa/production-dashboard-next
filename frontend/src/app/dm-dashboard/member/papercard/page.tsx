import type { Metadata } from "next";
import MemberPapercardPage from "@/features/dm-dashboard/member/papercard/MemberPapercardPage";

export const metadata: Metadata = {
  title: "Papercard Anggota Lini · DM Digital",
  description: "Form pengisian checklist harian Papercard anggota tim lini (PROD, ME, PE, QC)",
};

export default function Page() {
  return <MemberPapercardPage />;
}
