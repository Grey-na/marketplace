import type { Metadata } from "next";
import RequireCustomer from "@/components/auth/RequireCustomer";
import CartContent from "@/components/cart/CartContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Your cart | ${SITE_NAME}` };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-14 md:px-10">
      <h1 className="font-display text-6xl leading-none md:text-7xl">Your <em>cart</em></h1>
      <RequireCustomer>
        <CartContent />
      </RequireCustomer>
    </main>
  );
}