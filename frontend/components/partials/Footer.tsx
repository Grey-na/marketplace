import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/#trending", label: "Trending now" },
      { href: "/products?sort=newest", label: "New arrivals" },
      { href: "/shops", label: "All shops" },
    ],
  },
  {
    title: "Sell",
    links: [
      { href: "/register", label: "Open your shop" },
      { href: "/login", label: "Seller login" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/cart", label: "Your cart" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 overflow-hidden rounded-t-[3rem] bg-charcoal text-cream">
      <div className="mx-auto max-w-7xl px-6 pt-16 md:px-10">
        {/* the call to action for sellers */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-frame bg-butter p-8 text-charcoal md:flex-row md:items-center md:p-10">
          <h2 className="font-display text-4xl leading-tight md:text-5xl">
            Got a shop? <em>Let people find it.</em>
          </h2>
          <Link href="/register" className="btn-sticker shrink-0 bg-paper">Open your shop</Link>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-4">
          <p className="max-w-xs text-cream/70">
            A marketplace where small shops get discovered through their products, whatever their following.
          </p>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-display text-2xl text-butter">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-pink">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* the giant wordmark: each letter jumps when the mouse touches it */}
        <div aria-hidden className="mt-16 select-none whitespace-nowrap text-center font-display text-[17vw] leading-[0.8] text-lavender">
          {SITE_NAME.split("").map((letter, index) => (
            <span key={index} className="inline-block transition duration-300 hover:-translate-y-4 hover:text-pink">
              {letter}
            </span>
          ))}
        </div>

        <p className="pb-6 pt-8 text-center text-sm text-cream/50">
          Made in Nepal ✦ {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}