import Image from "next/image";
import CardLink from "../../product/CardLink";
import TiltCard from "@/components/ui/TiltCard";
import { formatPrice }from "@/lib/format";
import { frameFor } from "@/lib/frames";
import type { ProductCardData } from "@/types/api";

const BADGES: Record<string, string> = {
  fresh_find: "Fresh find",
  hidden_gem: "Hidden gem",
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images?.[0]?.url;
  const badge = product.reason ? BADGES[product.reason] : undefined;

  return (
    <TiltCard>
      <CardLink
      productId={product._id}
        href={`/products/${product.slug}`}
        className={`group block rounded-frame p-2.5 transition duration-300 hover:shadow-sticker ${frameFor(product.category?.color)}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-inner bg-paper">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized={image.startsWith("http://localhost")}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-charcoal/40">No image</div>
          )}

          {product.shop && (
            <span className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1 text-xs font-medium">
              {product.shop.name}
            </span>
          )}
          {badge && (
            <span className="absolute bottom-3 left-3 rounded-full border-2 border-charcoal bg-coral px-3 py-1 text-xs font-bold text-paper shadow-sticker-sm">
              {badge}
            </span>
          )}
        </div>

        <div className="px-2 pb-2 pt-3">
          <h3 className="font-display text-xl leading-tight">{product.title}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-semibold">{formatPrice(product.afterDiscount)}</span>
            {product.discount > 0 && (
              <span className="text-sm line-through opacity-60">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </CardLink>
    </TiltCard>
  );
}