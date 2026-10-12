import ClientAppShell from "@/components/ClientAppShell";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ClientAppShell />
      {children}
    </>
  );
}
