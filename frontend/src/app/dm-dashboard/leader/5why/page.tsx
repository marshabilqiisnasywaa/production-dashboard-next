import type { Metadata } from "next";
import FiveWhyWorkspace from "@/features/dm-dashboard/fivewhy/FiveWhyWorkspace";

export const metadata: Metadata = {
  title: "5Why & PDCA",
};

export default function Page() {
  return <FiveWhyWorkspace />;
}
