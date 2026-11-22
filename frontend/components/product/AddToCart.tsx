"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { ApiRequestError, apiFetch } from "@/lib/client-api";

const MAX_QUANTITY = 10;

export default function AddToCart({ productId, slug, stock }: { productId: string; slug: string; stock: number }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { setCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "saving" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  const max = Math.min(MAX_QUANTITY, stock);

  if (stock < 1) {
    return <p className="rounded-2xl border-2 border-charcoal bg-paper px-5 py-3 font-semibold">Sold out for now</p>;
  }
  if (user && user.role !== "customer") {
    return <p className="rounded-2xl bg-paper px-5 py-3 text-sm">Shopping is for customer accounts. Log in with a customer account to buy.</p>;
  }

  const add = async () => {
    if (!user) {
      // not logged in: log in first, then come back to this product
      router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }
    setState("saving");
    setError(null);
    try {
      const response = await apiFetch<{ itemCount: number }>("/customer/cart/items", {
        method: "POST",
        body: { productId, quantity },
      });
      setCount(response.result.itemCount);
      setState("added");
      setTimeout(() => setState("idle"), 2200);
    } catch (caught) {
      setState("idle");
      setError(caught instanceof ApiRequestError ? (caught.fields.quantity ?? caught.message) : "Could not add to cart. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border-2 border-charcoal bg-paper">
          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="One less" className="grid h-12 w-11 place-items-center rounded-l-full transition hover:bg-butter">
            <Minus size={16} />
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
          <button type="button" onClick={() => setQuantity(Math.min(max, quantity + 1))} aria-label="One more" className="grid h-12 w-11 place-items-center rounded-r-full transition hover:bg-butter">
            <Plus size={16} />
          </button>
        </div>

        <button type="button" onClick={add} disabled={loading || state === "saving"} className="btn-sticker gap-2 disabled:opacity-60">
          {state === "added" ? <><Check size={18} /> Added!</> : <><ShoppingBag size={18} /> {state === "saving" ? "Adding..." : "Add to cart"}</>}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}