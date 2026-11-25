import type { Metadata } from "next";
import SellerProducts from "@/components/seller/SellerProducts";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Products | ${SITE_NAME}` };

export default function SellerProductsPage() {
  return <SellerProducts />;
}