import type { Metadata } from "next";
import LoginPage from "@/features/auth/LoginPage";

export const metadata: Metadata = {
  title: "Masuk - Production Dashboard",
};

export default function Page() {
  return <LoginPage />;
}
