import { cache } from "react";
import { apiGet } from "./api";
import type { ShopDetailData } from "@/types/api";

// the page and its metadata share one backend call
export const getShop = cache((slug: string) => apiGet<ShopDetailData>(`/shops/${encodeURIComponent(slug)}`));