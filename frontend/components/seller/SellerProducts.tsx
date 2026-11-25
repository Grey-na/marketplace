"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { CARD, FIELD } from "@/components/dashboard/styles";
import ProductBadge from "./ProductBadge";
import { formatPrice } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";
import type { SellerProduct } from "@/types/api";

export default function SellerProducts() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "12" });
  if (query) params.set("search", query);
  if (status) params.set("status", status);
  const { data, pagination, error, loading } = useApiData<SellerProduct[]>(`/seller/products?${params.toString()}`);

  return (
    <div>
      <PageHeader
        title="Products"
        text="Add products, change prices and stock, and set them live."
        action={<Link href="/seller/products/new" className="btn-solid"><Plus size={16} /> Add a product</Link>}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
          setPage(1);
        }}
        className="mb-5 flex flex-wrap gap-3"
      >
        <label className="sr-only" htmlFor="product-search">Search products</label>
        <input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title..." className={`${FIELD} max-w-xs`} />
        <label className="sr-only" htmlFor="product-status">Status</label>
        <select id="product-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`${FIELD} w-auto`}>
          <option value="">All products</option>
          <option value="active">Live</option>
          <option value="inactive">Drafts</option>
        </select>
        <button type="submit" className="btn-outline">Search</button>
      </form>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-charcoal/10" />
      ) : error ? (
        <div role="alert" className={CARD}>
          <p className="font-medium text-red-700">{error}</p>
          {error.includes("shop") && <Link href="/seller/shop" className="btn-outline mt-3">Go to My shop</Link>}
        </div>
      ) : !data || data.length === 0 ? (
        <div className={`${CARD} py-12 text-center`}>
          <p className="font-display text-3xl">No products here yet</p>
          <p className="mt-2 text-sm">Your shop needs to be approved before you can add products.</p>
          <Link href="/seller/products/new" className="btn-solid mt-5">Add a product</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((product) => {
            const category = typeof product.category === "object" ? product.category?.title : null;
            return (
              <li key={product._id} className={`${CARD} flex items-center gap-4 !p-3`}>
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-charcoal bg-cream">
                  {product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/seller/products/${product._id}`} className="block truncate font-semibold hover:underline">{product.title}</Link>
                  <p className="text-xs opacity-70">{category ?? "No category"} · {formatPrice(product.afterDiscount)}{product.discount > 0 && ` (-${product.discount}%)`}</p>
                </div>
                <p className={`hidden shrink-0 text-sm font-semibold sm:block ${product.stock <= 5 ? "text-red-700" : ""}`}>
                  {product.stock === 0 ? "Sold out" : `${product.stock} in stock`}
                </p>
                <ProductBadge product={product} />
                <Link href={`/seller/products/${product._id}`} className="btn-outline !px-3 !py-1.5">Edit</Link>
              </li>
            );
          })}
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