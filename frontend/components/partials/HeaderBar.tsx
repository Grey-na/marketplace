"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { frameFor } from "@/lib/frames";
import { SITE_NAME } from "@/lib/site";
import type { CategoryLite } from "@/types/api";
import UserMenu from "./UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV = [
  { href: "/products", label: "Discover" },
  { href: "/shops", label: "Shops" },
];

const iconButton = "grid h-10 w-10 place-items-center rounded-full transition hover:bg-butter";

export default function HeaderBar({ categories }: { categories: CategoryLite[] }) {
  const router = useRouter();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { user, loading, logout } = useAuth();
  const cartCount = 0; // becomes real when we build the cart (F7)

  // hide while scrolling down, show again while scrolling up
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 140);
  });

  // while the mobile menu is open: the page behind it does not scroll, and Escape closes it
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <>
      <motion.div
        animate={{ y: hidden && !menuOpen ? -110 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="pointer-events-none sticky top-4 z-40 flex justify-center px-4"
      >
        <header className="pointer-events-auto flex w-full max-w-5xl items-center gap-3 rounded-full border-2 border-charcoal bg-paper/90 px-4 py-2 shadow-sticker backdrop-blur md:gap-5 md:px-6">
          <Link href="/" className="font-display text-2xl leading-none">
            {SITE_NAME}<span className="text-coral">.</span>
          </Link>

          {/* desktop links */}
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-butter">
                {item.label}
              </Link>
            ))}

            {categories.length > 0 && (
              <div className="group relative">
                <button className="rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-butter" aria-haspopup="true">
                  Categories
                </button>
                {/* pt-3 bridges the gap, so the menu does not close while the mouse travels to it */}
                <div className="invisible absolute left-0 top-full pt-3 opacity-0 transition duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="flex w-64 flex-wrap gap-2 rounded-frame border-2 border-charcoal bg-paper p-4 shadow-sticker">
                    {categories.map((category) => (
                      <Link
                        key={category._id}
                        href={`/category/${category.slug}`}
                        className={`rounded-full border-2 border-charcoal px-3 py-1 text-sm font-medium transition hover:-rotate-3 hover:shadow-sticker-sm ${frameFor(category.color)}`}
                      >
                        {category.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {/* search: an icon that opens an input (desktop) */}
            {searchOpen ? (
              <form onSubmit={submitSearch} className="hidden items-center gap-1 md:flex">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setSearchOpen(false)}
                  placeholder="Search products..."
                  className="w-48 rounded-full border-2 border-charcoal bg-cream px-4 py-1.5 text-sm outline-none focus:bg-butter/40"
                />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className={iconButton}>
                  <X size={18} />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} aria-label="Search" className={`${iconButton} hidden md:grid`}>
                <Search size={19} />
              </button>
            )}

            <Link href="/wishlist" aria-label="Wishlist" className={`${iconButton} hidden md:grid`}>
              <Heart size={19} />
            </Link>

            <Link href="/cart" aria-label="Cart" className={`${iconButton} relative`}>
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-charcoal bg-coral px-1 text-[10px] font-bold text-paper">
                  {cartCount}
                </span>
              )}
            </Link>

                        {loading ? (
              <span className="ml-1 h-10 w-24 animate-pulse rounded-full bg-charcoal/10" />
            ) : user ? (
              <UserMenu user={user} onLogout={logout} />
            ) : (
              <>
                <Link href="/login" className="btn-sticker ml-1 hidden !px-4 !py-1.5 text-sm md:inline-flex">
                  Log in
                </Link>
                <Link href="/login" aria-label="Log in" className={`${iconButton} md:hidden`}>
                  <User size={19} />
                </Link>
              </>
            )}

            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className={`${iconButton} md:hidden`}>
              <Menu size={21} />
            </button>
          </div>
        </header>
      </motion.div>

      {/* the mobile menu: a circle that grows from the top right corner */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ clipPath: "circle(0% at 90% 4%)" }}
            animate={{ clipPath: "circle(150% at 90% 4%)" }}
            exit={{ clipPath: "circle(0% at 90% 4%)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto bg-lavender px-6 py-6 md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl">{SITE_NAME}<span className="text-coral">.</span></span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full border-2 border-charcoal bg-paper shadow-sticker-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitSearch} className="mt-8">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full border-2 border-charcoal bg-paper px-5 py-3 outline-none"
              />
            </form>

            <nav className="mt-8 flex flex-col gap-1">
              {[{ href: "/", label: "Home" }, ...NAV, { href: "/wishlist", label: "Wishlist" }, { href: "/cart", label: "Cart" }].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.06 }}
                >
                  <Link href={item.href} onClick={() => setMenuOpen(false)} className="block font-display text-5xl leading-tight">
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {categories.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/category/${category.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-full border-2 border-charcoal px-4 py-2 text-sm font-medium shadow-sticker-sm ${frameFor(category.color)}`}
                  >
                    {category.title}
                  </Link>
                ))}
              </div>
            )}

                        {user ? (
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.push("/");
                }}
                className="btn-sticker mt-10 w-full bg-paper"
              >
                Log out ({user.fullName.split(" ")[0]})
              </button>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-sticker mt-10 w-full bg-butter">
                Log in or sign up
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}