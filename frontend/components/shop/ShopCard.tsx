import Link from "next/link";
import RemoteImage from "@/components/ui/RemoteImage";
import type { ShopCardData } from "@/types/api";

export default function ShopCard({ shop, fluid = false }: { shop: ShopCardData; fluid?: boolean }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
     className={`group block rounded-frame border-2 border-charcoal bg-paper p-2.5 shadow-sticker transition duration-300 hover:-translate-y-1 hover:-rotate-1 ${fluid ? "w-full" : "w-72 shrink-0 snap-start"}`}
    >
      <div className="relative h-32 overflow-hidden rounded-inner bg-pink/40">
        {shop.cover?.url && (
          <RemoteImage src={shop.cover.url} alt="" fill sizes="288px" className="object-cover transition duration-500 group-hover:scale-105" />
        )}
      </div>

      <div className="px-3 pb-3">
        {/* the logo overlaps the cover */}
        <div className="relative -mt-8 mb-2 h-16 w-16 overflow-hidden rounded-full border-2 border-charcoal bg-butter">
          {shop.logo?.url ? (
            <RemoteImage src={shop.logo.url} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center font-display text-3xl">{shop.name.charAt(0)}</span>
          )}
        </div>

        <h3 className="font-display text-2xl leading-tight">
          {shop.name}
          {shop.isVerified && (
            <>
              <span aria-hidden className="ml-1 text-coral">✦</span>
              <span className="sr-only"> (verified shop)</span>
            </>
          )}
        </h3>
        {shop.description && <p className="mt-1 line-clamp-2 text-sm opacity-80">{shop.description}</p>}
        <p className="mt-3 text-xs font-semibold opacity-70">
          {shop.followerCount} followers · {shop.ratingCount > 0 ? `★ ${shop.ratingAvg.toFixed(1)}` : "New shop"}
        </p>
      </div>
    </Link>
  );
}