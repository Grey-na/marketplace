import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FollowButton from "@/components/shop/FollowButton";
import ShopCatalog from "@/components/shop/ShopCatalog";
import RemoteImage from "@/components/ui/RemoteImage";
import Stars from "@/components/ui/Stars";
import { ApiHttpError, apiGet } from "@/lib/api";
import { getShop } from "@/lib/shops";
import { SITE_NAME } from "@/lib/site";
import type { ProductCardData, ShopDetailData } from "@/types/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { result } = await getShop(slug);
    return {
      title: `${result.name} | ${SITE_NAME}`,
      description: result.description ?? `Products from ${result.name}`,
      openGraph: { images: result.cover?.url ? [result.cover.url] : [] },
    };
  } catch {
    return { title: SITE_NAME };
  }
}

export default async function ShopPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const focusSlug = typeof raw.focus === "string" ? raw.focus : undefined;

  let shop: ShopDetailData;
  try {
    shop = (await getShop(slug)).result;
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  // the shop's products. If this fails, the shop page still opens
  let products: ProductCardData[] = [];
  let total = 0;
  try {
    const response = await apiGet<ProductCardData[]>(`/products?shop=${encodeURIComponent(slug)}&limit=50&sort=newest`);
    products = response.result;
    total = response.pagination?.count ?? products.length;
      } catch (error) {
    console.error("[shop page] could not load", slug, error instanceof ApiHttpError ? error.status : error);
    if (error instanceof ApiHttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  

  const joined = shop.createdAt
    ? new Date(shop.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;
  const contact = shop.contact;
  const hasContact = Boolean(contact?.phone || contact?.email || contact?.address);

  return (
    <main>
      {/* the cover */}
      <div className="relative h-56 overflow-hidden border-b-2 border-charcoal bg-lavender bg-dots md:h-80">
        {shop.cover?.url && <RemoteImage src={shop.cover.url} alt="" fill priority sizes="100vw" className="object-cover" />}
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
        {/* the logo overlaps the cover */}
        <div className="-mt-16 flex flex-col gap-6 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-2 border-charcoal bg-butter shadow-sticker md:h-40 md:w-40">
              {shop.logo?.url ? (
                <RemoteImage src={shop.logo.url} alt={`${shop.name} logo`} fill priority sizes="160px" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center font-display text-6xl">{shop.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="font-display text-5xl leading-none md:text-7xl">
                {shop.name}
                {shop.isVerified && (
                  <>
                    <span aria-hidden className="ml-2 text-coral">✦</span>
                    <span className="sr-only"> (verified shop)</span>
                  </>
                )}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                {shop.ratingCount > 0 ? (
                  <span className="inline-flex items-center gap-2">
                    <Stars rating={shop.ratingAvg} />
                    {shop.ratingAvg.toFixed(1)} ({shop.ratingCount} reviews)
                  </span>
                ) : (
                  <span>New shop</span>
                )}
                <span>{total} products</span>
                {joined && <span>On the marketplace since {joined}</span>}
              </div>
            </div>
          </div>

          <FollowButton slug={shop.slug} initialCount={shop.followerCount} />
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_20rem]">
          {shop.description ? <p className="max-w-2xl whitespace-pre-line text-lg">{shop.description}</p> : <div />}

          {hasContact && (
            <aside className="h-fit rounded-frame border-2 border-charcoal bg-paper p-5 shadow-sticker-sm">
              <h2 className="font-display text-2xl">Visit info</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {contact?.phone && (
                  <div>
                    <dt className="font-semibold">Phone</dt>
                    <dd><a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a></dd>
                  </div>
                )}
                {contact?.email && (
                  <div>
                    <dt className="font-semibold">Email</dt>
                    <dd><a href={`mailto:${contact.email}`} className="break-all underline">{contact.email}</a></dd>
                  </div>
                )}
                {contact?.address && (
                  <div>
                    <dt className="font-semibold">Address</dt>
                    <dd>{contact.address}</dd>
                  </div>
                )}
              </dl>
            </aside>
          )}
        </div>

        <section className="mt-16">
          <h2 className="mb-8 font-display text-5xl">
            The <em>shelves</em>
          </h2>
          <ShopCatalog products={products} total={total} focusSlug={focusSlug} />
        </section>
      </div>
    </main>
  );
}