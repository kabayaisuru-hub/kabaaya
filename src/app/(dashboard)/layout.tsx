import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { requireAdminSession } from "@/lib/firebase-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Header />
      <div className="flex-1 w-full pb-safe-area-inset-bottom">
        {children}
      </div>
      <BottomNavigation />
    </div>
  );
}
