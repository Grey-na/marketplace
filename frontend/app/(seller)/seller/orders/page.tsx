import type { Metadata } from "next";
import SellerOrders from "@/components/seller/SellerOrders";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Orders | ${SITE_NAME}` };

export default function SellerOrdersPage() {
  return <SellerOrders />;
}