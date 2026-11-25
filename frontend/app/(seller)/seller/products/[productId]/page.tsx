import type { Metadata } from "next";
import ProductEditor from "@/components/seller/ProductEditor";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Edit product | ${SITE_NAME}` };

export default async function EditProductPage({
  params, searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { productId } = await params;
  const raw = await searchParams;
  return <ProductEditor productId={productId} isNew={raw.new === "1"} />;
}