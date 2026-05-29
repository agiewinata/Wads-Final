import { redirect } from "next/navigation";
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
  if (!user) redirect("/login");

  return (
    <TimerProvider userId={user.id}>
      <div className="flex min-h-screen bg-zinc-100">
        <Sidebar userName={user.name} />
        <main className="flex-1 min-w-0 p-6 overflow-auto">{children}</main>
        <AffirmationPopup />
        <TimerPopup />
      </div>
    </TimerProvider>
  );
}