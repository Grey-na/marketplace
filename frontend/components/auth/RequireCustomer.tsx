"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function RequireCustomer({ children }: { children: React.ReactNode }) {
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
      <div className="mt-10" aria-busy="true">
        <div className="h-64 animate-pulse rounded-frame bg-charcoal/10" />
      </div>
    );
  }

  if (user.role !== "customer") {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-4xl">Customers only</p>
        <p className="mt-3">This page is for customer accounts. You are logged in as a {user.role}.</p>
        <Link href="/" className="btn-sticker mt-8">Back home</Link>
      </div>
    );
  }

  return <>{children}</>;
}