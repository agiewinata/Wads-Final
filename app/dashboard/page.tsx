import { getUser } from "@/lib/dal";
import { redirect } from "next/navigation";
import ProfileCard from "@/app/dashboard/_components/ProfileCard";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) redirect("/login");

  return (
    <ProfileCard
      name={user.name}
      email={user.email}
      createdAt={user.createdAt}
    />
  );
}