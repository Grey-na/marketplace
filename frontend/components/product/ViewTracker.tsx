"use client";

import { useEffect } from "react";
import { trackProduct } from "@/lib/track";

// reports "someone looked at this product" once. The backend ignores repeats within 30 minutes
export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackProduct(productId, "view");
  }, [productId]);
  return null;
}