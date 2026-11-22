"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/types/api";

export default function UserMenu({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // close when the mouse clicks outside, or Escape is pressed
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links =
    user.role === "seller"
      ? [{ href: "/seller", label: "Seller dashboard" }]
      : user.role === "admin"
        ? [{ href: "/admin", label: "Admin panel" }]
        : [
            { href: "/orders", label: "My orders" },
            { href: "/wishlist", label: "Wishlist" },
          ];

  const logout = async () => {
    setOpen(false);
    await onLogout();
    router.push("/");
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        className="ml-1 grid h-10 w-10 place-items-center rounded-full border-2 border-charcoal bg-pink font-bold shadow-sticker-sm transition hover:-rotate-6"
      >
        {user.fullName.trim().charAt(0).toUpperCase()}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-3 w-60 rounded-frame border-2 border-charcoal bg-paper p-3 shadow-sticker">
          <p className="px-2 font-display text-xl leading-tight">{user.fullName}</p>
          <p className="truncate px-2 pb-2 text-xs opacity-60">{user.username}</p>
          <div className="border-t-2 border-charcoal/10 pt-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} role="menuitem" className="block rounded-xl px-2 py-2 text-sm font-medium transition hover:bg-butter">
                {link.label}
              </Link>
            ))}
            <button onClick={logout} role="menuitem" className="block w-full rounded-xl px-2 py-2 text-left text-sm font-medium transition hover:bg-pink/60">
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}