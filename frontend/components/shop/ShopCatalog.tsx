"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "@/components/product/ProductCard";
import { frameFor } from "@/lib/frames";
import type { CategoryLite, ProductCardData } from "@/types/api";

export default function ShopCatalog({
  products, total, focusSlug,
}: {
  products: ProductCardData[];
  total: number;              // how many products the shop has in all
  focusSlug?: string;         // the product the visitor came from
}) {
  const [selected, setSelected] = useState("all");

  // the categories this shop actually sells in
  const categories = useMemo(() => {
    const unique = new Map<string, CategoryLite>();
    products.forEach((product) => {
      if (product.category) unique.set(product.category._id, product.category);
    });
    return [...unique.values()];
  }, [products]);

  // filter by category, and keep the focus product first
  const visible = useMemo(() => {
    const list = selected === "all" ? products : products.filter((product) => product.category?._id === selected);
    if (!focusSlug) return list;
    return [...list].sort((a, b) => Number(b.slug === focusSlug) - Number(a.slug === focusSlug));
  }, [products, selected, focusSlug]);

  if (products.length === 0) {
    return (
      <div className="rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
        <p className="font-display text-4xl">No products yet.</p>
        <p className="mt-2">This shop is getting ready. Come back soon!</p>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div role="group" aria-label="Filter by category" className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelected("all")}
            aria-pressed={selected === "all"}
            className={`rounded-full border-2 border-charcoal px-4 py-1.5 text-sm font-semibold transition ${
              selected === "all" ? "-translate-y-0.5 bg-charcoal text-cream shadow-sticker-sm" : "bg-paper hover:bg-butter"
            }`}
          >
            All ({products.length})
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => setSelected(category._id)}
              aria-pressed={selected === category._id}
              className={`rounded-full border-2 border-charcoal px-4 py-1.5 text-sm font-semibold transition ${frameFor(category.color)} ${
                selected === category._id ? "-translate-y-0.5 shadow-sticker-sm" : "opacity-70 hover:opacity-100"
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-7">
        <AnimatePresence mode="popLayout">
          {visible.map((product) => {
            const focused = product.slug === focusSlug;
            return (
              <motion.div
                key={product._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className={focused ? "relative rounded-frame ring-4 ring-coral ring-offset-4 ring-offset-cream" : ""}
              >
                {focused && (
                  <span className="absolute -top-4 left-4 z-20 rounded-full border-2 border-charcoal bg-coral px-3 py-1 text-xs font-bold text-paper shadow-sticker-sm">
                    You were viewing this
                  </span>
                )}
                <ProductCard product={product} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {total > products.length && (
        <p className="mt-8 text-sm">Showing the first {products.length} of {total} products.</p>
      )}
    </div>
  );
}