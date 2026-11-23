import type { Metadata } from "next";
import RequireCustomer from "@/components/auth/RequireCustomer";
import OrdersContent from "@/components/order/OrdersContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `My orders | ${SITE_NAME}` };

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-14 md:px-10">
      <h1 className="font-display text-6xl leading-none md:text-7xl">My <em>orders</em></h1>
      <RequireCustomer>
        <OrdersContent />
      </RequireCustomer>
    </main>
  );
}