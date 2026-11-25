"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { UserRole } from "@/types/api";

export default function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16" aria-busy="true">
        <div className="h-48 animate-pulse rounded-2xl bg-charcoal/10" />
      </div>
    );
  }

  if (user.role !== role) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-display text-4xl">This area is for {role} accounts</p>
        <p className="mt-3">You are logged in as a {user.role}.</p>
        <Link href="/" className="btn-sticker mt-8">Back home</Link>
      </div>
    );
  }

  return <>{children}</>;
}