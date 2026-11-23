"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import RemoteImage from "@/components/ui/RemoteImage";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";
import type { CartLine, CartView } from "@/types/api";

const MAX_QUANTITY = 10;

const problemText = (line: CartLine): string | null => {
  if (line.problem === "unavailable") return "No longer available. Remove it to continue.";
  if (line.problem === "out_of_stock") return "Out of stock. Remove it to continue.";
  if (line.problem === "not_enough_stock") return `Only ${line.stock} left. Lower the quantity to continue.`;
  return null;
};

export default function CartContent() {
  const { data: cart, error, loading, setData } = useApiData<CartView>("/customer/cart");
  const { setCount } = useCart();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // one group per shop, because each shop sends its own parcel
  const groups = useMemo(() => {
    const map = new Map<string, { shop: CartLine["shop"]; lines: CartLine[] }>();
    cart?.items.forEach((line) => {
      const key = line.shop?._id ?? "gone";
      const group = map.get(key) ?? { shop: line.shop, lines: [] };
      group.lines.push(line);
      map.set(key, group);
    });
    return [...map.values()];
  }, [cart]);

  const change = async (productId: string, request: { method: string; body?: unknown }) => {
    setBusy(productId);
    setMessage(null);
    try {
      const response = await apiFetch<CartView>(`/customer/cart/items/${productId}`, request);
      setData(response.result);
      setCount(response.result.itemCount);
    } catch (caught) {
      setMessage(caught instanceof ApiRequestError ? (caught.fields.quantity ?? caught.message) : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="mt-10 h-64 animate-pulse rounded-frame bg-charcoal/10" />;
  }
  if (error || !cart) {
    return <p role="alert" className="mt-10 font-medium text-red-700">{error ?? "Could not load your cart."}</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mt-10 rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
        <p className="font-display text-5xl">Your cart is feeling light.</p>
        <p className="mt-2">Go find something that makes you smile.</p>
        <Link href="/products" className="btn-sticker mt-6">Discover products</Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {message && <p role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{message}</p>}

        {groups.map((group) => (
          <section key={group.shop?._id ?? "gone"} className="rounded-frame border-2 border-charcoal bg-paper p-5">
            <h2 className="font-display text-2xl">
              {group.shop ? (
                <>Parcel from <Link href={`/shops/${group.shop.slug}`} className="underline decoration-coral decoration-2 underline-offset-4">{group.shop.name}</Link></>
              ) : (
                "Unavailable items"
              )}
            </h2>

            <ul className="mt-4 divide-y-2 divide-charcoal/10">
              {group.lines.map((line) => {
                const problem = problemText(line);
                const max = Math.min(MAX_QUANTITY, line.stock);
                return (
                  <li key={line.productId} className="flex gap-4 py-4">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-charcoal bg-cream">
                      {line.image && <RemoteImage src={line.image} alt="" fill sizes="80px" className="object-cover" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl leading-tight">
                        {line.slug ? <Link href={`/products/${line.slug}`} className="hover:underline">{line.title}</Link> : line.title}
                      </p>
                      <p className="mt-1 text-sm">
                        {formatPrice(line.unitPrice)}
                        {line.discount > 0 && <span className="ml-2 line-through opacity-60">{formatPrice(line.originalPrice)}</span>}
                      </p>
                      {problem && <p role="alert" className="mt-1 text-sm font-semibold text-red-700">{problem}</p>}

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {line.problem !== "unavailable" && (
                          <div className="flex items-center rounded-full border-2 border-charcoal">
                            <button
                              type="button"
                              disabled={busy === line.productId || line.quantity <= 1}
                              onClick={() => change(line.productId, { method: "PATCH", body: { quantity: line.quantity - 1 } })}
                              aria-label="One less"
                              className="grid h-9 w-9 place-items-center rounded-l-full transition hover:bg-butter disabled:opacity-40"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-7 text-center text-sm font-semibold" aria-live="polite">{line.quantity}</span>
                            <button
                              type="button"
                              disabled={busy === line.productId || line.quantity >= max}
                              onClick={() => change(line.productId, { method: "PATCH", body: { quantity: line.quantity + 1 } })}
                              aria-label="One more"
                              className="grid h-9 w-9 place-items-center rounded-r-full transition hover:bg-butter disabled:opacity-40"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={busy === line.productId}
                          onClick={() => change(line.productId, { method: "DELETE" })}
                          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline disabled:opacity-40"
                        >
                          <Trash2 size={15} /> Remove
                        </button>
                      </div>
                    </div>

                    <p className="shrink-0 font-semibold">{formatPrice(line.lineTotal)}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <aside className="h-fit rounded-frame border-2 border-charcoal bg-butter p-6 shadow-sticker lg:sticky lg:top-28">
        <h2 className="font-display text-3xl">Summary</h2>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt>Delivery ({cart.shopCount} {cart.shopCount === 1 ? "parcel" : "parcels"})</dt>
            <dd>{formatPrice(cart.deliveryCharge)}</dd>
          </div>
          <div className="flex justify-between border-t-2 border-charcoal pt-3 text-xl font-bold"><dt>Total</dt><dd>{formatPrice(cart.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs">Every shop sends its own parcel, so the delivery charge is per shop.</p>

        {cart.hasProblems ? (
          <p className="mt-5 rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-red-800">Fix the items marked above to continue.</p>
        ) : (
          <Link href="/checkout" className="btn-sticker mt-5 w-full bg-paper">Checkout</Link>
        )}
      </aside>
    </div>
  );
}