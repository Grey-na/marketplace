"use client";

import { ClipboardList, LayoutDashboard, Package, Store } from "lucide-react";
import RequireRole from "@/components/auth/RequireRole";
import DashboardShell, { type NavItem } from "./DashboardShell";

const NAV: NavItem[] = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ClipboardList },
  { href: "/seller/shop", label: "My shop", icon: Store },
];

export default function SellerShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="seller">
      <DashboardShell title="Seller dashboard" nav={NAV}>{children}</DashboardShell>
    </RequireRole>
  );
}