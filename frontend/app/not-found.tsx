import Link from "next/link";
import Footer from "@/components/partials/Footer";
import Header from "@/components/partials/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="font-display text-[9rem] leading-none text-transparent [-webkit-text-stroke:3px_var(--charcoal)] md:text-[13rem]">
            404
          </p>
          <h1 className="font-display text-4xl md:text-5xl">This page wandered off.</h1>
          <p className="mt-3">Maybe the product sold out, or the link is old.</p>
          <Link href="/" className="btn-sticker mt-8">Back to the fun part</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}