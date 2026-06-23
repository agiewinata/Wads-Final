import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUser } from "@/lib/dal";
import Sidebar from "./_components/Sidebar";
import AffirmationPopup from "./_components/AffirmationPopup";
import { TimerProvider } from "./_components/TimerProvider";
import TimerPopup from "./_components/TimerPopup";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? "/dashboard";
    const search   = h.get("x-search") ?? "";
    const callbackUrl = encodeURIComponent(pathname + search);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return (
    <TimerProvider userId={user.id}>
      <div className="flex min-h-screen desk-bg">
        <Sidebar userName={user.name} />
        <main className="flex-1 min-w-0 px-6 pb-6 pt-14 sm:pt-6 overflow-auto">{children}</main>
        <AffirmationPopup />
        <TimerPopup />
      </div>
    </TimerProvider>
  );
}