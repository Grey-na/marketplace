"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SITE_NAME } from "@/lib/site";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export default function DashboardShell({
  title, nav, children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-2 border-charcoal bg-paper">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-8">
          <Link href="/" className="font-display text-2xl leading-none">
            {SITE_NAME}<span className="text-coral">.</span>
          </Link>
          <span className="rounded-full bg-lavender px-3 py-0.5 text-xs font-bold">{title}</span>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="font-medium hover:underline">Back to the store</Link>
            {user && (
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="inline-flex items-center gap-1 font-medium hover:underline"
              >
                <LogOut size={15} /> Log out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[13rem_1fr] md:px-8 md:py-10">
        <nav aria-label={title} className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-charcoal text-cream" : "hover:bg-lavender/60"
                }`}
              >
                <Icon size={17} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}