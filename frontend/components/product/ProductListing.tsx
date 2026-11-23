import Link from "next/link";
import FilterToggle from "./FilterToggle";
import Pagination from "./Pagination";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import { apiGet } from "@/lib/api";
import { apiQuery, pageHref, parseListing } from "@/lib/listing";
import type { CategoryLite, ProductCardData } from "@/types/api";

export default async function ProductListing({
  searchParams, basePath, fixedCategory,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  fixedCategory?: string;      // set on a category page, so the category chips are not needed
}) {
  const params = parseListing(searchParams);

  const [products, categories] = await Promise.all([
    apiGet<ProductCardData[]>(`/products?${apiQuery(params, fixedCategory).toString()}`),
    fixedCategory
      ? Promise.resolve<CategoryLite[]>([])
      : apiGet<CategoryLite[]>("/categories/home?limit=50", { revalidate: 60 }).then((response) => response.result),
  ]);
  const pagination = products.pagination ?? { page: 1, count: 0, limit: 12, totalPages: 1 };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 md:px-10">
      <div className="grid gap-8 md:grid-cols-[17rem_1fr]">
        <aside className="md:sticky md:top-28 md:self-start">
          <FilterToggle>
            <ProductFilters params={params} categories={categories} basePath={basePath} fixedCategory={fixedCategory} />
          </FilterToggle>
        </aside>

        <div>
          <p className="mb-6 text-sm font-medium" aria-live="polite">
            {params.search ? <>Results for “<strong>{params.search}</strong>” · </> : null}
            {pagination.count} {pagination.count === 1 ? "product" : "products"}
          </p>

          {products.result.length === 0 ? (
            <div className="rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
              <p className="font-display text-4xl">Nothing here yet.</p>
              <p className="mt-2">Try another word, or loosen the filters.</p>
              <Link href={basePath} className="btn-sticker mt-6">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-7">
              {products.result.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hrefFor={(page) => pageHref(basePath, params, page, fixedCategory)}
          />
        </div>
      </div>
    </section>
  );
}