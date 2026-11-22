import { getAnonId } from "./anon";

// tell the backend that someone looked at or clicked a product (fire and forget).
// A logged in customer is recognized by the cookie. A visitor by the anonymous id
export const trackProduct = (productId: string, type: "view" | "click") => {
  const anonId = getAnonId();
  if (!anonId) return;
  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, type, anonId }),
    keepalive: true,        // the request still finishes while the browser changes page
  }).catch(() => {
    // tracking must never disturb the person
  });
};