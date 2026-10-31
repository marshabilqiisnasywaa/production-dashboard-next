import ClientAppShell from "@/components/ClientAppShell";
import { AuthProvider } from "@/features/auth/AuthProvider";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <ClientAppShell />
      {children}
    </AuthProvider>
  );
}
