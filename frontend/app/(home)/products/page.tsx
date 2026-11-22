import type { Metadata } from "next";
import ProductListing from "@/components/product/ProductListing";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Discover | ${SITE_NAME}` };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 pb-2 pt-14 md:px-10">
        <h1 className="font-display text-6xl leading-none md:text-8xl">
          Discover <em>everything</em>
        </h1>
      </section>
      <ProductListing searchParams={params} basePath="/products" />
    </main>
  );
}