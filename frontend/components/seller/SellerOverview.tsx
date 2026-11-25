"use client";

import Link from "next/link";
import BarChart from "@/components/dashboard/BarChart";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { CARD } from "@/components/dashboard/styles";
import { formatPrice } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";
import type { SellerStats } from "@/types/api";

const SHOP_NOTES: Record<string, { text: string; className: string }> = {
  pending: { text: "Your shop is being reviewed. You can add products as soon as it is approved.", className: "bg-butter" },
  rejected: { text: "Your shop was not approved. Open My shop to see why, fix it and save to send it back for review.", className: "bg-pink" },
  suspended: { text: "Your shop is suspended, so customers cannot see it. Please contact support.", className: "bg-pink" },
};

export default function SellerOverview() {
  const { data: stats, error, loading } = useApiData<SellerStats>("/seller/stats");

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-charcoal/10" />;
  }

  // a new seller who has not opened a shop yet
  if (error === "Create your shop first") {
    return (
      <div className={`${CARD} py-14 text-center`}>
        <p className="font-display text-4xl">Let&apos;s open your shop</p>
        <p className="mx-auto mt-3 max-w-md">Add a name, a logo and a few details. After a quick review by our team, you can start adding products.</p>
        <Link href="/seller/shop" className="btn-solid mt-6">Open my shop</Link>
      </div>
    );
  }
  if (error || !stats) {
    return <p role="alert" className="font-medium text-red-700">{error ?? "Could not load your numbers."}</p>;
  }

  const note = SHOP_NOTES[stats.shop.status];
  const toHandle = (stats.orders.pending ?? 0) + (stats.orders.confirmed ?? 0) + (stats.orders.packed ?? 0);

  return (
    <div>
      <PageHeader
        title={stats.shop.name}
        text="Here is how your shop is doing."
        action={stats.shop.status === "approved" ? <Link href={`/shops/${stats.shop.slug}`} className="btn-outline">View my shop</Link> : undefined}
      />

      {note && (
        <p role="status" className={`mb-6 rounded-2xl border-2 border-charcoal px-5 py-3 text-sm font-semibold ${note.className}`}>
          {note.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Earned" value={formatPrice(stats.sales.earned)} hint="Items in delivered parcels" accent="border-t-mint" />
        <StatCard label="On its way" value={formatPrice(stats.sales.inProgress)} hint="Pending, confirmed, packed and shipped" accent="border-t-butter" />
        <StatCard label="New orders" value={String(stats.orders.pending ?? 0)} hint={`${toHandle} parcels need your attention`} accent="border-t-coral" />
        <StatCard label="Products" value={`${stats.products.active} / ${stats.products.total}`} hint="Live / all" />
        <StatCard label="Followers" value={String(stats.shop.followerCount)} accent="border-t-pink" />
        <StatCard label="Rating" value={stats.shop.ratingCount > 0 ? `${stats.shop.ratingAvg.toFixed(1)} ★` : "No reviews yet"} hint={`${stats.shop.ratingCount} reviews`} />
      </div>

      <section className={`${CARD} mt-6`}>
        <h2 className="font-display text-2xl">Last 14 days</h2>
        <p className="text-xs opacity-70">The bars are sales value. The number above a bar is how many orders came in.</p>
        <div className="mt-3">
          <BarChart data={stats.daily} label="Sales and orders in the last 14 days" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="font-display text-2xl">Top products</h2>
          {stats.topProducts.length === 0 ? (
            <p className="mt-3 text-sm">Your best sellers will show up here after the first orders.</p>
          ) : (
            <ol className="mt-3 divide-y divide-charcoal/10">
              {stats.topProducts.map((product, index) => (
                <li key={product.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate"><strong>{index + 1}.</strong> {product.title}</span>
                  <span className="shrink-0 opacity-70">{product.units} sold · {formatPrice(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={CARD}>
          <h2 className="font-display text-2xl">Running low</h2>
          {stats.products.lowStock.length === 0 ? (
            <p className="mt-3 text-sm">Nothing is running low. Nice!</p>
          ) : (
            <ul className="mt-3 divide-y divide-charcoal/10">
              {stats.products.lowStock.map((product) => (
                <li key={product._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/seller/products/${product._id}`} className="min-w-0 truncate font-medium hover:underline">{product.title}</Link>
                  <span className={`shrink-0 font-semibold ${product.stock === 0 ? "text-red-700" : ""}`}>{product.stock === 0 ? "Sold out" : `${product.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/seller/orders" className="btn-solid">Go to orders</Link>
        <Link href="/seller/products/new" className="btn-outline">Add a product</Link>
      </div>
    </div>
  );
}