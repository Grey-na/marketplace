type RawParams = Record<string, string | string[] | undefined>;

export type ListingParams = {
  search: string;
  category: string;
  sort: string;
  min: string;      // in rupees
  max: string;      // in rupees
  inStock: boolean;
  page: number;
};

const SORTS = ["newest", "popular", "rating", "price_asc", "price_desc"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const cleanNumber = (value?: string) => {
  const number = Number(value);
  return value && Number.isFinite(number) && number >= 0 ? String(number) : "";
};

// what is written in the address bar, cleaned up (nobody can break the page with a strange address)
export const parseListing = (raw: RawParams): ListingParams => {
  const sort = first(raw.sort) ?? "newest";
  return {
    search: (first(raw.search) ?? "").trim().slice(0, 100),
    category: first(raw.category) ?? "",
    sort: SORTS.includes(sort) ? sort : "newest",
    min: cleanNumber(first(raw.min)),
    max: cleanNumber(first(raw.max)),
    inStock: first(raw.inStock) === "true",
    page: Math.max(1, Math.floor(Number(first(raw.page))) || 1),
  };
};

// the question we ask the backend
export const apiQuery = (params: ListingParams, fixedCategory?: string, limit = 12) => {
  const query = new URLSearchParams({ limit: String(limit), page: String(params.page), sort: params.sort });
  if (params.search) query.set("search", params.search);
  const category = fixedCategory ?? params.category;
  if (category) query.set("category", category);
  if (params.min) query.set("minPrice", String(Math.round(Number(params.min) * 100)));
  if (params.max) query.set("maxPrice", String(Math.round(Number(params.max) * 100)));
  if (params.inStock) query.set("inStock", "true");
  return query;
};

// the address of the same listing on another page (for the pagination links)
export const pageHref = (basePath: string, params: ListingParams, page: number, fixedCategory?: string) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (!fixedCategory && params.category) query.set("category", params.category);
  if (params.sort !== "newest") query.set("sort", params.sort);
  if (params.min) query.set("min", params.min);
  if (params.max) query.set("max", params.max);
  if (params.inStock) query.set("inStock", "true");
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${basePath}?${text}` : basePath;
};