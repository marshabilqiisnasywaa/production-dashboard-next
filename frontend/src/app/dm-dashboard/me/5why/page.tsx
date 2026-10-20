import type { Metadata } from "next";
import FiveWhyPage from "@/features/dm-dashboard/fivewhy/FiveWhyPage";

export const metadata: Metadata = {
  title: "5Why & PDCA",
};

export default function Page() {
  return <FiveWhyPage />;
}
