"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut();
      router.push("/login");
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full py-2 text-sm font-medium text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
      style={{
        border: "3px solid #111",
        borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
      }}
    >
      {isPending ? "Logging out..." : "Log out"}
    </button>
  );
}
