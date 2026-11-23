"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/client-api";

export default function FollowButton({ slug, initialCount }: { slug: string; initialCount: number }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const role = user?.role;

  // do I already follow this shop?
  useEffect(() => {
    if (loading || role !== "customer") return;
    let cancelled = false;
    apiFetch<{ following: boolean }>(`/customer/shops/${slug}/follow`)
      .then((response) => {
        if (!cancelled) setFollowing(response.result.following);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, role, slug]);

  // sellers and admins do not follow shops
  if (role && role !== "customer") {
    return <span className="text-sm font-semibold">{count} followers</span>;
  }

  const toggle = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/shops/${slug}`)}`);
      return;
    }
    setBusy(true);
    try {
      if (following) {
        await apiFetch(`/customer/shops/${slug}/follow`, { method: "DELETE" });
        setFollowing(false);
        setCount((value) => Math.max(0, value - 1));
      } else {
        await apiFetch(`/customer/shops/${slug}/follow`, { method: "POST" });
        setFollowing(true);
        setCount((value) => value + 1);
      }
    } catch {
      // nothing changed, the button stays as it was
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        className={`btn-sticker disabled:opacity-60 ${following ? "bg-mint" : "bg-butter"}`}
      >
        {following ? "Following ✓" : "Follow"}
      </button>
      <span aria-live="polite" className="text-sm font-semibold">{count} followers</span>
    </div>
  );
}