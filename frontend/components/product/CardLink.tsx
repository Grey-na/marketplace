"use client";

import Link from "next/link";
import { trackProduct } from "@/lib/track";

// a link that also reports the click to the recommendation engine
export default function CardLink({
  productId, href, className, children,
}: {
  productId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackProduct(productId, "click")}>
      {children}
    </Link>
  );
}