import type { Metadata } from "next";
import RequireCustomer from "@/components/auth/RequireCustomer";
import CheckoutContent from "@/components/cart/CheckoutContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Checkout | ${SITE_NAME}` };

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-14 md:px-10">
      <h1 className="font-display text-6xl leading-none md:text-7xl"><em>Almost</em> yours</h1>
      <RequireCustomer>
        <CheckoutContent />
      </RequireCustomer>
    </main>
  );
}