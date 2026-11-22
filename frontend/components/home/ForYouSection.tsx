"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import SectionHeading from "@/components/home/SectionHeading";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/client-api";
import { getAnonId } from "@/lib/anon";
import type { ProductCardData } from "@/types/api";

type Recommendations = { personalized: boolean; forYou: ProductCardData[] };

export default function ForYouSection() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Recommendations | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // wait until we know whether someone is logged in
    if (loading) return;
    let cancelled = false;

    const query = new URLSearchParams({ limit: "8" });
    const anonId = getAnonId();
    if (anonId) query.set("anonId", anonId);

    apiFetch<Recommendations>(`/recommendations/home?${query.toString()}`)
      .then((response) => {
        if (!cancelled) setData(response.result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user?._id]);

  if (failed) return null;

  const personalized = data?.personalized ?? false;

  return (
    <div>
      <SectionHeading
        eyebrow={personalized ? "Made for you" : "Popular picks"}
        title={personalized ? <>Picked <em>for you</em></> : <>Popular <em>this week</em></>}
        text={
          personalized
            ? "Based on what you have looked at, saved and bought."
            : "Click around on what you like, and this row learns your taste."
        }
      />

      {!data ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/5] animate-pulse rounded-frame bg-paper/50" />
          ))}
        </div>
      ) : data.forYou.length === 0 ? (
        <p>Nothing to show yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7">
          {data.forYou.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}