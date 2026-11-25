import type { Metadata } from "next";
import SellerOrderDetail from "@/components/seller/SellerOrderDetail";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Order | ${SITE_NAME}` };

export default async function SellerOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <SellerOrderDetail orderId={orderId} />;
}