import type { Metadata } from "next";
import MyProblemsPage from "@/features/dm-dashboard/member/MyProblemsPage";

export const metadata: Metadata = {
  title: "Masalah Saya PE · DM Digital",
};

export default function Page() {
  return <MyProblemsPage />;
}
