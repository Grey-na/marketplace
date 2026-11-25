import type { Metadata } from "next";
import ShopForm from "@/components/seller/ShopForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `My shop | ${SITE_NAME}` };

export default function SellerShopPage() {
  return <ShopForm />;
}