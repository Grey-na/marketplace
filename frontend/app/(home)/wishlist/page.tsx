import type { Metadata } from "next";
import RequireCustomer from "@/components/auth/RequireCustomer";
import WishlistContent from "@/components/wishlist/WishlistContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Wishlist | ${SITE_NAME}` };

export default function WishlistPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-14 md:px-10">
      <h1 className="font-display text-6xl leading-none md:text-7xl">Your <em>wishlist</em></h1>
      <RequireCustomer>
        <WishlistContent />
      </RequireCustomer>
    </main>
  );
}