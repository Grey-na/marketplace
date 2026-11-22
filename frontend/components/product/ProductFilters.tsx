import Link from "next/link";
import type { ListingParams } from "@/lib/listing";
import type { CategoryLite } from "@/types/api";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  popular: "Most popular",
  rating: "Best rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const inputClass = "w-full rounded-2xl border-2 border-charcoal bg-cream px-4 py-2.5 outline-none focus:bg-butter/30";
const chipClass =
  "inline-block cursor-pointer rounded-full border-2 border-charcoal bg-paper px-3 py-1 text-sm font-medium transition peer-checked:bg-butter peer-checked:shadow-sticker-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-charcoal";

export default function ProductFilters({
  params, categories, basePath, fixedCategory,
}: {
  params: ListingParams;
  categories: CategoryLite[];
  basePath: string;
  fixedCategory?: string;
}) {
  return (
    <form action={basePath} method="get" className="space-y-6 rounded-frame border-2 border-charcoal bg-paper p-5">
      <div>
        <label htmlFor="search" className="mb-1.5 block text-sm font-semibold">Search</label>
        <input id="search" name="search" defaultValue={params.search} placeholder="Hoodie, mug, serum..." className={inputClass} />
      </div>

      {!fixedCategory && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Category</legend>
          <div className="flex flex-wrap gap-2">
            <label>
              <input type="radio" name="category" value="" defaultChecked={!params.category} className="peer sr-only" />
              <span className={chipClass}>All</span>
            </label>
            {categories.map((category) => (
              <label key={category._id}>
                <input type="radio" name="category" value={category.slug} defaultChecked={params.category === category.slug} className="peer sr-only" />
                <span className={chipClass}>{category.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="sort" className="mb-1.5 block text-sm font-semibold">Sort by</label>
        <select id="sort" name="sort" defaultValue={params.sort} className={inputClass}>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Price (Rs.)</legend>
        <div className="flex items-center gap-2">
          <input name="min" type="number" min="0" defaultValue={params.min} placeholder="Min" aria-label="Minimum price" className={inputClass} />
          <span aria-hidden>–</span>
          <input name="max" type="number" min="0" defaultValue={params.max} placeholder="Max" aria-label="Maximum price" className={inputClass} />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="inStock" value="true" defaultChecked={params.inStock} className="h-5 w-5 accent-charcoal" />
        Only show what is in stock
      </label>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn-sticker flex-1">Apply</button>
        <Link href={basePath} className="text-sm font-semibold underline decoration-coral decoration-2 underline-offset-4">Clear</Link>
      </div>
    </form>
  );
}