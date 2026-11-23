"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReviewBox from "./ReviewBox";
import RemoteImage from "@/components/ui/RemoteImage";
import StatusChip from "@/components/ui/StatusChip";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { PARCEL_LABELS, PAYMENT_LABELS } from "@/lib/status";
import { useApiData } from "@/lib/useApiData";
import type { MyReview, OrderData, Parcel } from "@/types/api";

const STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];

// the little progress line of a parcel
function Steps({ status }: { status: string }) {
  if (status === "cancelled") return null;
  const current = STEPS.indexOf(status);     // "awaiting_payment" is before the first step

  return (
    <ol className="mt-4 flex items-center" aria-label="Progress">
      {STEPS.map((step, index) => (
        <li key={step} className="flex flex-1 items-center last:flex-none">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-charcoal text-xs font-bold ${index <= current ? "bg-mint" : "bg-paper"}`}>
            {index <= current ? "✓" : index + 1}
            <span className="sr-only"> {PARCEL_LABELS[step]}{index <= current ? " (done)" : ""}</span>
          </span>
          {index < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${index < current ? "bg-charcoal" : "bg-charcoal/20"}`} />}
        </li>
      ))}
    </ol>
  );
}

function ParcelCard({
  parcel, reviews, onChanged,
}: {
  parcel: Parcel;
  reviews: Map<string, MyReview>;
  onChanged: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the customer can cancel until the shop starts packing
  const canCancel = parcel.status === "pending" || parcel.status === "confirmed";
  const lastNote = parcel.status === "cancelled" ? parcel.timeline?.[parcel.timeline.length - 1]?.note : null;

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/customer/shop-orders/${parcel._id}/cancel`, {
        method: "POST",
        body: reason.trim() ? { reason: reason.trim() } : {},
      });
      setCancelling(false);
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.status ?? caught.message) : "Could not cancel. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-frame border-2 border-charcoal bg-paper p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl">
          {parcel.shop ? <Link href={`/shops/${parcel.shop.slug}`} className="underline decoration-coral decoration-2 underline-offset-4">{parcel.shop.name}</Link> : "Shop"}
        </h3>
        <StatusChip status={parcel.status} kind="parcel" />
      </div>

      <Steps status={parcel.status} />

      {lastNote && <p className="mt-3 text-sm">{lastNote}</p>}
      {parcel.refund?.status === "pending" && (
        <p className="mt-3 rounded-2xl bg-butter px-4 py-2 text-sm font-semibold">Your refund of {formatPrice(parcel.refund.amount)} is being processed.</p>
      )}
      {parcel.refund?.status === "refunded" && (
        <p className="mt-3 rounded-2xl bg-mint px-4 py-2 text-sm font-semibold">{formatPrice(parcel.refund.amount)} was refunded.</p>
      )}
      {parcel.shipment?.trackingNo && (
        <p className="mt-3 text-sm">Tracking number: <strong>{parcel.shipment.trackingNo}</strong></p>
      )}

      <ul className="mt-5 divide-y-2 divide-charcoal/10">
        {parcel.items.map((item) => (
          <li key={item.product} className="py-4">
            <div className="flex gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-charcoal bg-cream">
                {item.image && <RemoteImage src={item.image} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight">
                  {item.slug ? <Link href={`/products/${item.slug}`} className="hover:underline">{item.title}</Link> : item.title}
                </p>
                <p className="text-sm">{formatPrice(item.unitPrice)} × {item.quantity}</p>
              </div>
              <p className="shrink-0 font-semibold">{formatPrice(item.lineTotal)}</p>
            </div>

            {/* reviews are only for products that were delivered */}
            {parcel.status === "delivered" && (
              <ReviewBox productId={item.product} existing={reviews.get(item.product)} onChanged={onChanged} />
            )}
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(parcel.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(parcel.deliveryCharge)}</dd></div>
        <div className="flex justify-between font-bold"><dt>Parcel total</dt><dd>{formatPrice(parcel.total)}</dd></div>
      </dl>

      {canCancel && !cancelling && (
        <button type="button" onClick={() => setCancelling(true)} className="mt-4 text-sm font-medium underline">Cancel this parcel</button>
      )}
      {cancelling && (
        <div className="mt-4 rounded-2xl bg-cream p-4">
          <label htmlFor={`reason-${parcel._id}`} className="text-sm font-semibold">Why are you cancelling? (optional)</label>
          <input id={`reason-${parcel._id}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} className="mt-1 w-full rounded-2xl border-2 border-charcoal bg-paper px-3 py-2 text-sm outline-none" />
          {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={cancel} disabled={busy} className="btn-sticker !px-4 !py-1.5 bg-pink text-sm disabled:opacity-60">{busy ? "Cancelling..." : "Yes, cancel it"}</button>
            <button type="button" onClick={() => setCancelling(false)} className="text-sm font-medium underline">Keep it</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function OrderDetailContent({ orderId, justPlaced }: { orderId: string; justPlaced: boolean }) {
  const { data: order, error, loading, reload: reloadOrder } = useApiData<OrderData>(`/customer/orders/${orderId}`);
  const { data: myReviews, reload: reloadReviews } = useApiData<MyReview[]>("/customer/reviews");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const reviews = useMemo(() => new Map((myReviews ?? []).map((review) => [review.product, review])), [myReviews]);

  const refresh = () => {
    reloadOrder();
    reloadReviews();
  };

  const payNow = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const response = await apiFetch<{ payUrl: string }>(`/customer/orders/${orderId}/pay/esewa`, { method: "POST" });
      window.location.href = response.result.payUrl;
    } catch (caught) {
      setPayError(caught instanceof ApiRequestError ? caught.message : "Could not start the payment.");
      setPaying(false);
    }
  };

  if (loading) return <div className="mt-10 h-64 animate-pulse rounded-frame bg-charcoal/10" />;
  if (error || !order) {
    return (
      <div className="mt-10">
        <p role="alert" className="font-medium text-red-700">{error ?? "Order not found."}</p>
        <Link href="/orders" className="btn-sticker mt-6">Back to my orders</Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {justPlaced && order.status !== "awaiting_payment" && (
        <p role="status" className="mb-6 rounded-2xl border-2 border-charcoal bg-mint px-5 py-4 font-semibold shadow-sticker-sm">
          Order placed! The shops have been told and will start preparing your parcels. ✦
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-5xl leading-none md:text-6xl">{order.orderNo}</h1>
        <StatusChip status={order.status} kind="order" />
      </div>
      <p className="mt-2 text-sm opacity-70">
        Placed {new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {order.status === "awaiting_payment" && order.payment.method === "esewa" && (
        <div className="mt-6 rounded-frame border-2 border-charcoal bg-butter p-5">
          <p className="font-semibold">This order is waiting for your payment. It is kept for 30 minutes, then cancelled.</p>
          {payError && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{payError}</p>}
          <button type="button" onClick={payNow} disabled={paying} className="btn-sticker mt-3 bg-paper disabled:opacity-60">
            {paying ? "Opening eSewa..." : "Pay now with eSewa"}
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {order.shopOrders.map((parcel) => (
            <ParcelCard key={parcel._id} parcel={parcel} reviews={reviews} onChanged={refresh} />
          ))}
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="rounded-frame border-2 border-charcoal bg-paper p-5">
            <h2 className="font-display text-2xl">Delivery</h2>
            <address className="mt-2 text-sm not-italic">
              <strong>{order.address.fullName}</strong><br />
              {order.address.street}, {order.address.city}<br />
              {order.address.landmark && <>{order.address.landmark}<br /></>}
              {order.address.phone}
            </address>
            {order.note && <p className="mt-3 text-sm"><strong>Your note:</strong> {order.note}</p>}
          </div>

          <div className="rounded-frame border-2 border-charcoal bg-butter p-5 shadow-sticker-sm">
            <h2 className="font-display text-2xl">Payment</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Method</dt><dd>{PAYMENT_LABELS[order.payment.method] ?? order.payment.method}</dd></div>
              <div className="flex justify-between"><dt>Status</dt><dd className="font-semibold capitalize">{order.payment.status}</dd></div>
              <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(order.deliveryCharge)}</dd></div>
              <div className="flex justify-between border-t-2 border-charcoal pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}