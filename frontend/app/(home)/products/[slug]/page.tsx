import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Band from "@/components/home/Band";
import SectionHeading from "@/components/home/SectionHeading";
import AddToCart from "@/components/product/AddToCart";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ReviewList from "@/components/product/ReviewList";
import ViewTracker from "@/components/product/ViewTracker";
import WishlistButton from "@/components/product/WishlistButton";
import RemoteImage from "@/components/ui/RemoteImage";
import Stars from "@/components/ui/Stars";
import { ApiHttpError, apiGet } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/products";
import { SITE_NAME } from "@/lib/site";
import type { ProductCardData, ProductDetailData, ReviewsResult } from "@/types/api";

// the extra sections must never break the page: if one fails, it simply stays empty
const safe = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { result } = await getProduct(slug);
    return {
      title: `${result.title} | ${SITE_NAME}`,
      description: result.summary,
      openGraph: { images: result.images[0]?.url ? [result.images[0].url] : [] },
    };
  } catch {
    return { title: SITE_NAME };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product: ProductDetailData;
  try {
    product = (await getProduct(slug)).result;
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const encoded = encodeURIComponent(slug);
  const shopSlug = product.shop?.slug;

  const [reviews, similar, fromShop] = await Promise.all([
    safe(
      apiGet<ReviewsResult>(`/products/${encoded}/reviews?limit=10`).then((response) => response.result),
      { ratingAvg: 0, ratingCount: 0, reviews: [] } as ReviewsResult
    ),
    safe(
      apiGet<ProductCardData[]>(`/products/${encoded}/similar?limit=8`).then((response) => response.result),
      [] as ProductCardData[]
    ),
    shopSlug
      ? safe(
          apiGet<ProductCardData[]>(`/products?shop=${encodeURIComponent(shopSlug)}&limit=5`).then((response) => response.result),
          [] as ProductCardData[]
        )
      : Promise.resolve([] as ProductCardData[]),
  ]);
  const moreFromShop = fromShop.filter((item) => item._id !== product._id).slice(0, 4);
  const shop = product.shop;
  const stockText =
    product.stock < 1 ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left` : "In stock";

  return (
    <main>
      <ViewTracker productId={product._id} />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-10 md:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <Link href="/" className="hover:underline">Home</Link> ›{" "}
          {product.category && (
            <>
              <Link href={`/category/${product.category.slug}`} className="hover:underline">{product.category.title}</Link> ›{" "}
            </>
          )}
          <span aria-current="page" className="font-semibold">{product.title}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div className="md:sticky md:top-28 md:self-start">
            <ProductGallery images={product.images} title={product.title} />
          </div>

          <div>
            {shop && (
              <Link
                href={`/shops/${shop.slug}?focus=${encodeURIComponent(product.slug)}`}
                className="inline-flex items-center gap-3 rounded-full border-2 border-charcoal bg-paper py-1.5 pl-1.5 pr-4 shadow-sticker-sm transition hover:-rotate-1"
              >
                <span className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-charcoal bg-butter">
                  {shop.logo?.url ? (
                    <RemoteImage src={shop.logo.url} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <span className="grid h-full place-items-center font-display text-lg">{shop.name.charAt(0)}</span>
                  )}
                </span>
                <span className="text-sm font-semibold">
                  {shop.name}
                  {shop.isVerified && <span aria-label="Verified shop" className="ml-1 text-coral">✦</span>}
                </span>
              </Link>
            )}

            <h1 className="mt-5 font-display text-5xl leading-none md:text-6xl">{product.title}</h1>

            {reviews.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
                <Stars rating={reviews.ratingAvg} />
                <span className="font-semibold">{reviews.ratingAvg.toFixed(1)}</span>
                <span className="underline">({reviews.ratingCount} reviews)</span>
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-5xl">{formatPrice(product.afterDiscount)}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-lg line-through opacity-60">{formatPrice(product.price)}</span>
                  <span className="-rotate-3 rounded-full border-2 border-charcoal bg-coral px-3 py-1 text-sm font-bold text-paper shadow-sticker-sm">
                    -{product.discount}%
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 text-lg">{product.summary}</p>

            <p className={`mt-4 text-sm font-semibold ${product.stock < 1 ? "text-red-700" : ""}`}>{stockText}</p>

            <div className="mt-4 flex flex-wrap items-start gap-3">
              <AddToCart productId={product._id} slug={product.slug} stock={product.stock} />
              <WishlistButton productId={product._id} />
            </div>

            {product.highlights.length > 0 && (
              <ul className="mt-8 space-y-2">
                {product.highlights.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="text-coral">✦</span>
                    {line}
                  </li>
                ))}
              </ul>
            )}

            {product.attributes.length > 0 && (
              <dl className="mt-8 space-y-2 rounded-frame border-2 border-charcoal bg-paper p-5">
                {product.attributes.map((attribute) => (
                  <div key={attribute.name} className="flex gap-4">
                    <dt className="w-24 shrink-0 font-semibold">{attribute.name}</dt>
                    <dd>{attribute.values.join(", ")}</dd>
                  </div>
                ))}
                {product.brand && (
                  <div className="flex gap-4">
                    <dt className="w-24 shrink-0 font-semibold">Brand</dt>
                    <dd>{product.brand}</dd>
                  </div>
                )}
              </dl>
            )}

            {product.description && (
              <div className="mt-8">
                <h2 className="font-display text-3xl">About this product</h2>
                <p className="mt-2 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {(product.shippingPolicy || product.returnPolicy) && (
              <div className="mt-8 space-y-3">
                {product.shippingPolicy && (
                  <details className="rounded-2xl border-2 border-charcoal bg-paper p-4">
                    <summary className="cursor-pointer font-semibold">Shipping</summary>
                    <p className="mt-2">{product.shippingPolicy}</p>
                  </details>
                )}
                {product.returnPolicy && (
                  <details className="rounded-2xl border-2 border-charcoal bg-paper p-4">
                    <summary className="cursor-pointer font-semibold">Returns</summary>
                    <p className="mt-2">{product.returnPolicy}</p>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        <section id="reviews" className="mt-24 scroll-mt-28">
          <h2 className="font-display text-5xl">
            Reviews{" "}
            {reviews.ratingCount > 0 && (
              <span className="text-3xl opacity-60">
                {reviews.ratingAvg.toFixed(1)} ★ · {reviews.ratingCount}
              </span>
            )}
          </h2>
          <ReviewList reviews={reviews.reviews} />
        </section>
      </div>

      {moreFromShop.length > 0 && shop && (
        <Band className="bg-mint">
          <SectionHeading
            eyebrow="Same shop"
            title={<>More from <em>{shop.name}</em></>}
            href={`/shops/${shop.slug}?focus=${encodeURIComponent(product.slug)}`}
            linkLabel="Visit the shop"
          />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7">
            {moreFromShop.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </Band>
      )}

      {similar.length > 0 && (
        <Band className="bg-pink">
          <SectionHeading
            eyebrow="You might also like"
            title={<>More like <em>this</em></>}
            text="Similar things from other shops."
          />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7">
            {similar.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </Band>
      )}
    </main>
  );
}