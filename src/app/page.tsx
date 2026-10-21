"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <p role="status" aria-live="polite" className="text-sm font-medium text-slate-500">
        Cargando tu sesión…
      </p>
    </main>
  );
}
