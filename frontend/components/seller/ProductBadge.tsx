import type { SellerProduct } from "@/types/api";

export default function ProductBadge({ product }: { product: Pick<SellerProduct, "status" | "isBlocked"> }) {
  const view = product.isBlocked
    ? { label: "Blocked", className: "bg-pink" }
    : product.status === "active"
      ? { label: "Live", className: "bg-mint" }
      : { label: "Draft", className: "bg-butter" };

  return <span className={`inline-block rounded-full border-2 border-charcoal px-3 py-0.5 text-xs font-bold ${view.className}`}>{view.label}</span>;
}