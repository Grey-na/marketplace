import type { Metadata } from "next";
import RequireCustomer from "@/components/auth/RequireCustomer";
import OrderDetailContent from "@/components/order/OrderDetailContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Order | ${SITE_NAME}` };

export default async function OrderPage({
  params, searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderId } = await params;
  const raw = await searchParams;

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:px-10">
      <RequireCustomer>
        <OrderDetailContent orderId={orderId} justPlaced={raw.placed === "1"} />
      </RequireCustomer>
    </main>
  );
}