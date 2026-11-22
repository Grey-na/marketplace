import type { UserRole } from "@/types/api";

// where each kind of account lands after logging in.
// Sellers and admins get their dashboards in step F8 (until then they land on the home page)
export const ROLE_HOME: Record<UserRole, string> = {
  customer: "/",
  seller: "/",
  admin: "/",
};

// the ?next= address must be a path on THIS website. Never "//evil.com" or a full address
export const safeNext = (value?: string | null): string | null => {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) {
    return value;
  }
  return null;
};