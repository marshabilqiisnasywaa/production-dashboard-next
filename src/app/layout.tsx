import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Production Dashboard", description: "Production analytics dashboard" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
