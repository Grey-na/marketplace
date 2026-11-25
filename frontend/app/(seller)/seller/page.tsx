import type { Metadata } from "next";
import SellerOverview from "@/components/seller/SellerOverview";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Seller dashboard | ${SITE_NAME}` };

export default function SellerHomePage() {
  return <SellerOverview />;
}