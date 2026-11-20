"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { SceneCategory } from "./HeroScene";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-frame bg-lavender/30" />,
});

// shown when the person asked for less motion, or the device cannot do WebGL
function FlatFallback() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex gap-4">
        <div className="h-28 w-28 rounded-full border-2 border-charcoal bg-lavender shadow-sticker" />
        <div className="mt-10 h-28 w-28 rounded-full border-2 border-charcoal bg-mint shadow-sticker" />
        <div className="h-28 w-28 rounded-full border-2 border-charcoal bg-pink shadow-sticker" />
      </div>
    </div>
  );
}

export default function HeroSceneLoader({ categories }: { categories: SceneCategory[] }) {
  const reducedMotion = useReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
  }, []);

  if (reducedMotion || webgl === false) {
    return <FlatFallback />;
  }
  if (webgl === null) {
    return null;
  }
  return <HeroScene categories={categories} />;
}