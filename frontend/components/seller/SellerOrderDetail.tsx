"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { CARD, FIELD } from "@/components/dashboard/styles";
import StatusChip from "@/components/ui/StatusChip";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { PARCEL_LABELS, PAYMENT_LABELS } from "@/lib/status";
import { useApiData } from "@/lib/useApiData";
import type { SellerParcel } from "@/types/api";

// the next step for each status (the backend enforces the same rules)
const NEXT: Record<string, { status: string; label: string }> = {
  pending: { status: "confirmed", label: "Confirm this order" },
  confirmed: { status: "packed", label: "Mark as packed" },
  packed: { status: "shipped", label: "Mark as shipped" },
  shipped: { status: "delivered", label: "Mark as delivered" },
};
const CAN_CANCEL = ["pending", "confirmed", "packed"];

function Actions({ parcel, onChanged }: { parcel: SellerParcel; onChanged: () => void }) {
  const next = NEXT[parcel.status];
  const canCancel = CAN_CANCEL.includes(parcel.status);
  const [provider, setProvider] = useState("seller");
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/seller/orders/${parcel._id}/status`, { method: "PATCH", body });
      setCancelling(false);
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.status ?? caught.fields.note ?? caught.message) : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!next && !canCancel) {
    return <p className="text-sm">No more actions for this parcel.</p>;
  }

  return (
    <div className="space-y-4">
      {/* when shipping: how will it travel? */}
      {parcel.status === "packed" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="provider" className="mb-1 block text-sm font-semibold">Delivered by</label>
            <select id="provider" value={provider} onChange={(event) => setProvider(event.target.value)} className={FIELD}>
              <option value="seller">My own delivery</option>
              <option value="third_party">A courier company</option>
              <option value="in_house">The marketplace</option>
            </select>
          </div>
          <div>
            <label htmlFor="tracking" className="mb-1 block text-sm font-semibold">Tracking number (optional)</label>
            <input id="tracking" value={tracking} onChange={(event) => setTracking(event.target.value)} maxLength={60} className={FIELD} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              send(
                next.status === "shipped"
                  ? { status: "shipped", provider, ...(tracking.trim() ? { trackingNo: tracking.trim() } : {}) }
                  : { status: next.status }
              )
            }
            className="btn-solid"
          >
            {busy ? "Working..." : next.label}
          </button>
        )}
        {canCancel && !cancelling && (
          <button type="button" onClick={() => setCancelling(true)} className="btn-outline hover:!bg-pink">Cancel this order</button>
        )}
      </div>

      {cancelling && (
        <div className="rounded-xl bg-cream p-4">
          <label htmlFor="reason" className="mb-1 block text-sm font-semibold">Why are you cancelling? The customer will see this.</label>
          <input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} className={FIELD} />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!reason.trim()) {
                  setError("Please give a reason for cancelling.");
                  return;
                }
                send({ status: "cancelled", note: reason.trim() });
              }}
              className="btn-solid"
            >
              Yes, cancel it
            </button>
            <button type="button" onClick={() => setCancelling(false)} className="btn-outline">Keep it</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

export default function SellerOrderDetail({ orderId }: { orderId: string }) {
  const { data: parcel, error, loading, reload } = useApiData<SellerParcel>(`/seller/orders/${orderId}`);

  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-charcoal/10" />;
  if (error || !parcel) {
    return (
      <div role="alert" className={CARD}>
        <p className="font-medium text-red-700">{error ?? "Order not found."}</p>
        <Link href="/seller/orders" className="btn-outline mt-3">Back to orders</Link>
      </div>
    );
  }

  const { order } = parcel;
  const cod = order.payment.method === "cod";

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        text={`Received ${new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`}
        action={<Link href="/seller/orders" className="btn-outline">← All orders</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">What to send</h2>
              <StatusChip status={parcel.status} kind="parcel" />
            </div>
            <ul className="mt-3 divide-y divide-charcoal/10">
              {parcel.items.map((item) => (
                <li key={item.product} className="flex items-center gap-3 py-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-charcoal bg-cream">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm opacity-70">{formatPrice(item.unitPrice)} × {item.quantity}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(parcel.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery charge</dt><dd>{formatPrice(parcel.deliveryCharge)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Parcel total</dt><dd>{formatPrice(parcel.total)}</dd></div>
            </dl>
          </section>

          <section className={CARD}>
            <h2 className="font-display text-2xl">Next step</h2>
            <div className="mt-3"><Actions parcel={parcel} onChanged={reload} /></div>
          </section>

          <section className={CARD}>
            <h2 className="font-display text-2xl">History</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(parcel.timeline ?? []).map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="flex gap-3">
                  <span className="w-36 shrink-0 opacity-70">{new Date(entry.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span><strong>{PARCEL_LABELS[entry.status] ?? entry.status}</strong>{entry.note ? ` · ${entry.note}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={CARD}>
            <h2 className="font-display text-2xl">Deliver to</h2>
            <address className="mt-2 text-sm not-italic">
              <strong>{order.address.fullName}</strong><br />
              {order.address.street}, {order.address.city}<br />
              {order.address.landmark && <>{order.address.landmark}<br /></>}
              <a href={`tel:${order.address.phone}`} className="underline">{order.address.phone}</a>
            </address>
            {order.note && <p className="mt-3 rounded-xl bg-cream p-3 text-sm"><strong>Note from the customer:</strong> {order.note}</p>}
          </section>

          <section className={`${CARD} ${cod ? "bg-butter" : "bg-mint"}`}>
            <h2 className="font-display text-2xl">Payment</h2>
            <p className="mt-2 text-sm">
              {cod
                ? <>Cash on delivery: collect <strong>{formatPrice(parcel.total)}</strong> from the customer when you hand over the parcel.</>
                : <>Paid online with {PAYMENT_LABELS[order.payment.method] ?? order.payment.method}. Nothing to collect.</>}
            </p>
            {parcel.shipment?.trackingNo && <p className="mt-2 text-sm">Tracking: <strong>{parcel.shipment.trackingNo}</strong></p>}
          </section>
        </aside>
      </div>
    </div>
  );
}