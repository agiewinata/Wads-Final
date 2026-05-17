import { getUser } from "@/lib/dal";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div
      className="bg-white w-full max-w-md p-10"
      style={{
        border: "4px solid #111",
        borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
        boxShadow: "6px 8px 0 rgba(0,0,0,0.18)",
      }}
    >
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
        Welcome back
      </h1>
      <p className="text-zinc-500 text-sm mb-8">{user.email}</p>

      <div className="space-y-3">
        <div
          className="flex justify-between items-center py-2 px-3"
          style={{ borderBottom: "2px solid #e4e4e7" }}
        >
          <span className="text-sm text-zinc-500">Name</span>
          <span className="text-sm font-medium text-zinc-800">
            {user.name ?? "—"}
          </span>
        </div>
        <div
          className="flex justify-between items-center py-2 px-3"
          style={{ borderBottom: "2px solid #e4e4e7" }}
        >
          <span className="text-sm text-zinc-500">Email</span>
          <span className="text-sm font-medium text-zinc-800">
            {user.email}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3">
          <span className="text-sm text-zinc-500">Member since</span>
          <span className="text-sm font-medium text-zinc-800">
            {user.createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
