import { getUser } from "@/lib/dal";
import { redirect } from "next/navigation";
import DashboardGrid from "./_components/DashboardGrid";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="p-6">
      <DashboardGrid user={user} />
    </main>
  );
}