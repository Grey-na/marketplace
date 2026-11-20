"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 500, damping: 35, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 500, damping: 35, mass: 0.4 });
  const [enabled, setEnabled] = useState(false);
  const [big, setBig] = useState(false);

  useEffect(() => {
    // only for a real mouse, and not for people who asked for less motion
    const hasMouse = window.matchMedia("(pointer: fine)").matches;
    const wantsLess = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasMouse || wantsLess) return;
    setEnabled(true);

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setBig(event.target instanceof Element && event.target.closest("a, button, [role='button']") !== null);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x: smoothX, y: smoothY }}
      animate={{ scale: big ? 1.9 : 1 }}
      className="pointer-events-none fixed left-0 top-0 z-50 -ml-4 -mt-4 h-8 w-8 rounded-full border-2 border-charcoal bg-pink/70 mix-blend-multiply"
    />
  );
}