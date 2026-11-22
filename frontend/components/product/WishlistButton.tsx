"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/client-api";

export default function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const role = user?.role;

  // is this product already on my wishlist?
  useEffect(() => {
    if (loading || role !== "customer") return;
    let cancelled = false;
    apiFetch<Array<{ _id: string }>>("/customer/wishlist")
      .then((response) => {
        if (!cancelled) setSaved(response.result.some((product) => product._id === productId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, role, productId]);

  if (role && role !== "customer") return null;

  const toggle = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        await apiFetch(`/customer/wishlist/${productId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await apiFetch(`/customer/wishlist/${productId}`, { method: "POST" });
        setSaved(true);
      }
    } catch {
      // the heart simply stays as it was
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className="grid h-12 w-12 place-items-center rounded-full border-2 border-charcoal bg-paper shadow-sticker-sm transition hover:-rotate-6 disabled:opacity-60"
    >
      {/* the key makes the heart pop every time it changes */}
      <motion.span key={String(saved)} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.5, 1] }} transition={{ duration: 0.4 }}>
        <Heart size={22} className={saved ? "text-coral" : ""} fill={saved ? "currentColor" : "none"} />
      </motion.span>
    </button>
  );
}