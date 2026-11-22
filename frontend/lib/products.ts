import { cache } from "react";
import { apiGet } from "./api";
import type { ProductDetailData } from "@/types/api";

export const getProduct = cache((slug: string) =>
  apiGet<ProductDetailData>(`/products/${encodeURIComponent(slug)}`)
);