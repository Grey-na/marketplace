"use client";

import Link from "next/link";
import { X } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { apiFetch } from "@/lib/client-api";
import { useApiData } from "@/lib/useApiData";
import type { ProductCardData } from "@/types/api";

export default function WishlistContent() {
  const { data, error, loading, setData } = useApiData<ProductCardData[]>("/customer/wishlist");

  const remove = async (productId: string) => {
    try {
      await apiFetch(`/customer/wishlist/${productId}`, { method: "DELETE" });
      setData((data ?? []).filter((product) => product._id !== productId));
    } catch {
      // the card simply stays
    }
  };

  if (loading) return <div className="mt-10 h-64 animate-pulse rounded-frame bg-charcoal/10" />;
  if (error) return <p role="alert" className="mt-10 font-medium text-red-700">{error}</p>;

  if (!data || data.length === 0) {
    return (
      <div className="mt-10 rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
        <p className="font-display text-5xl">Nothing saved yet.</p>
        <p className="mt-2">Tap the heart on a product to keep it here.</p>
        <Link href="/products" className="btn-sticker mt-6">Discover products</Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-7">
      {data.map((product) => (
        <div key={product._id} className="relative">
          <ProductCard product={product} />
          <button
            type="button"
            onClick={() => remove(product._id)}
            aria-label={`Remove ${product.title} from wishlist`}
            className="absolute right-4 top-4 z-30 grid h-9 w-9 place-items-center rounded-full border-2 border-charcoal bg-paper shadow-sticker-sm transition hover:rotate-90 hover:bg-pink"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}