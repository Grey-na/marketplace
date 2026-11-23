"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusChip from "@/components/ui/StatusChip";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/status";
import type { OrderSummary } from "@/types/api";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function OrdersContent() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async (target: number) => {
    try {
      const response = await apiFetch<OrderSummary[]>(`/customer/orders?page=${target}&limit=10`);
      setOrders((previous) => (target === 1 ? response.result : [...previous, ...response.result]));
      setTotalPages(response.pagination?.totalPages ?? 1);
      setPage(target);
    } catch {
      setError("Could not load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const payNow = async (orderId: string) => {
    setPaying(orderId);
    try {
      const response = await apiFetch<{ payUrl: string }>(`/customer/orders/${orderId}/pay/esewa`, { method: "POST" });
      window.location.href = response.result.payUrl;
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not start the payment.");
      setPaying(null);
    }
  };

  if (loading) return <div className="mt-10 h-64 animate-pulse rounded-frame bg-charcoal/10" />;

  if (orders.length === 0) {
    return (
      <div className="mt-10 rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
        <p className="font-display text-5xl">No orders yet.</p>
        <p className="mt-2">When you buy something, it shows up here.</p>
        <Link href="/products" className="btn-sticker mt-6">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      {error && <p role="alert" className="font-medium text-red-700">{error}</p>}

      {orders.map((order) => (
        <article key={order._id} className="rounded-frame border-2 border-charcoal bg-paper p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/orders/${order._id}`} className="font-display text-2xl underline decoration-coral decoration-2 underline-offset-4">
                {order.orderNo}
              </Link>
              <p className="text-sm opacity-70">
                {formatDate(order.createdAt)} · {PAYMENT_LABELS[order.payment.method] ?? order.payment.method}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip status={order.status} kind="order" />
              <span className="font-bold">{formatPrice(order.total)}</span>
            </div>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {order.shopOrders.map((parcel) => (
              <li key={parcel._id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <strong>{parcel.shop?.name ?? "Shop"}</strong> · {parcel.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
                <StatusChip status={parcel.status} kind="parcel" />
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/orders/${order._id}`} className="btn-sticker !px-4 !py-2 text-sm">View details</Link>
            {order.status === "awaiting_payment" && order.payment.method === "esewa" && (
              <button type="button" onClick={() => payNow(order._id)} disabled={paying === order._id} className="btn-sticker !px-4 !py-2 bg-mint text-sm disabled:opacity-60">
                {paying === order._id ? "Opening eSewa..." : "Pay now"}
              </button>
            )}
          </div>
        </article>
      ))}

      {page < totalPages && (
        <div className="text-center">
          <button type="button" onClick={() => load(page + 1)} className="btn-sticker bg-paper">Show older orders</button>
        </div>
      )}
    </div>
  );
}