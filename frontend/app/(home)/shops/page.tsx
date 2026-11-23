import type { Metadata } from "next";
import Pagination from "@/components/product/Pagination";
import ShopCard from "@/components/shop/ShopCard";
import { apiGet } from "@/lib/api";
import { SITE_NAME } from "@/lib/site";
import type { ShopCardData } from "@/types/api";

export const metadata: Metadata = { title: `Shops | ${SITE_NAME}` };

const SORTS: Record<string, string> = { popular: "Most followed", newest: "Newest", rating: "Best rated" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const inputClass = "rounded-2xl border-2 border-charcoal bg-paper px-4 py-2.5 outline-none focus:bg-butter/30";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;

  // the address bar, cleaned up
  const search = (first(raw.search) ?? "").trim().slice(0, 60);
  const sortValue = first(raw.sort) ?? "popular";
  const sort = sortValue in SORTS ? sortValue : "popular";
  const verified = first(raw.verified) === "true";
  const page = Math.max(1, Math.floor(Number(first(raw.page))) || 1);

  const query = new URLSearchParams({ sort, page: String(page), limit: "12" });
  if (search) query.set("search", search);
  if (verified) query.set("verified", "true");

  const shops = await apiGet<ShopCardData[]>(`/shops?${query.toString()}`);
  const pagination = shops.pagination ?? { page: 1, count: 0, limit: 12, totalPages: 1 };

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (sort !== "popular") next.set("sort", sort);
    if (verified) next.set("verified", "true");
    if (target > 1) next.set("page", String(target));
    const text = next.toString();
    return text ? `/shops?${text}` : "/shops";
  };

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-14 md:px-10">
      <h1 className="font-display text-6xl leading-none md:text-8xl">
        Meet the <em>makers</em>
      </h1>
      <p className="mt-4 max-w-xl text-lg">Every product has a shop behind it. Find the ones you like.</p>

      <form action="/shops" method="get" className="mt-10 flex flex-wrap items-end gap-4 rounded-frame border-2 border-charcoal bg-lavender p-5">
        <div>
          <label htmlFor="search" className="mb-1.5 block text-sm font-semibold">Shop name</label>
          <input id="search" name="search" defaultValue={search} placeholder="Search shops..." className={`w-56 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="sort" className="mb-1.5 block text-sm font-semibold">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} className={inputClass}>
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm font-semibold">
          <input type="checkbox" name="verified" value="true" defaultChecked={verified} className="h-5 w-5 accent-charcoal" />
          Verified only
        </label>
        <button type="submit" className="btn-sticker">Apply</button>
      </form>

      <p className="mb-6 mt-8 text-sm font-medium" aria-live="polite">
        {search ? <>Results for “<strong>{search}</strong>” · </> : null}
        {pagination.count} {pagination.count === 1 ? "shop" : "shops"}
      </p>

      {shops.result.length === 0 ? (
        <div className="rounded-frame border-2 border-dashed border-charcoal p-12 text-center">
          <p className="font-display text-4xl">No shops found.</p>
          <p className="mt-2">Try another name, or remove the verified filter.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.result.map((shop) => (
            <ShopCard key={shop._id} shop={shop} fluid />
          ))}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} hrefFor={hrefFor} />
    </main>
  );
}