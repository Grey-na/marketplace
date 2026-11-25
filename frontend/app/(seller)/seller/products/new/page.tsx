import type { Metadata } from "next";
import ProductEditor from "@/components/seller/ProductEditor";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `New product | ${SITE_NAME}` };

export default function NewProductPage() {
  return <ProductEditor />;
}