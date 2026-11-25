import SellerShell from "@/components/dashboard/SellerShell";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}