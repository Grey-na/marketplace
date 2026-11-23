import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Payment | ${SITE_NAME}` };

const MESSAGES: Record<string, { title: string; text: string; color: string }> = {
  success: { title: "Payment successful!", text: "Thank you. Your order is confirmed and the shops will start preparing your parcels.", color: "bg-mint" },
  pending: { title: "Checking your payment...", text: "We could not confirm it yet. If money was taken, your order will be confirmed in a few minutes.", color: "bg-butter" },
  failed: { title: "Payment not completed", text: "Your payment did not go through. Your order is kept for a short while, so you can try again from My orders.", color: "bg-pink" },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" && raw.status in MESSAGES ? raw.status : "failed";
  const orderNo = typeof raw.order === "string" && /^ORD-[A-Za-z0-9-]{1,40}$/.test(raw.order) ? raw.order : "";
  const message = MESSAGES[status];

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className={`rounded-frame border-2 border-charcoal p-10 shadow-sticker ${message.color}`}>
        <h1 className="font-display text-5xl leading-none md:text-6xl">{message.title}</h1>
        <p className="mt-4 text-lg">{message.text}</p>
        {orderNo && <p className="mt-4">Order <strong>{orderNo}</strong></p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/orders" className="btn-sticker bg-paper">View my orders</Link>
          <Link href="/" className="btn-sticker">Keep exploring</Link>
        </div>
      </div>
    </main>
  );
}