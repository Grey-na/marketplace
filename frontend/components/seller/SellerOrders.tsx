"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { CARD } from "@/components/dashboard/styles";
import StatusChip from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/status";
import { useApiData } from "@/lib/useApiData";
import type { SellerParcel } from "@/types/api";

const TABS = [
  { value: "pending", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
];

export default function SellerOrders() {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "15" });
  if (tab) params.set("status", tab);
  const { data, pagination, error, loading } = useApiData<SellerParcel[]>(`/seller/orders?${params.toString()}`);

  return (
    <div>
      <PageHeader title="Orders" text="Each order from a customer arrives as a parcel for your shop." />

      <div role="tablist" aria-label="Order status" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => {
              setTab(item.value);
              setPage(1);
            }}
            className={`shrink-0 rounded-full border-2 border-charcoal px-4 py-1.5 text-sm font-semibold transition ${
              tab === item.value ? "bg-charcoal text-cream" : "bg-paper hover:bg-butter"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-charcoal/10" />
      ) : error ? (
        <p role="alert" className="font-medium text-red-700">{error}</p>
      ) : !data || data.length === 0 ? (
        <div className={`${CARD} py-12 text-center`}>
          <p className="font-display text-3xl">Nothing here</p>
          <p className="mt-2 text-sm">Parcels with this status show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((parcel) => (
            <li key={parcel._id}>
              <Link href={`/seller/orders/${parcel._id}`} className={`${CARD} flex flex-wrap items-center gap-x-6 gap-y-2 !p-4 transition hover:bg-butter/30`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{parcel.order.orderNo}</p>
                  <p className="text-xs opacity-70">
                    {new Date(parcel.order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{parcel.order.address.fullName}, {parcel.order.address.city}
                  </p>
                </div>
                <p className="text-sm">{parcel.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                <p className="text-sm">
                  <strong>{formatPrice(parcel.total)}</strong>
                  <span className="ml-2 opacity-70">{PAYMENT_LABELS[parcel.order.payment.method] ?? parcel.order.payment.method}</span>
                </p>
                <StatusChip status={parcel.status} kind="parcel" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline">← Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="btn-outline">Next →</button>
        </div>
      )}
    </div>
  );
}