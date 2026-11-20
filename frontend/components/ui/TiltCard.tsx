"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

// a card that tilts toward the mouse, with a soft light that follows it
export default function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);   // 0 = left edge, 1 = right edge
  const py = useMotionValue(0.5);

  const spring = { stiffness: 200, damping: 18 };
  const rotateX = useSpring(useTransform(py, [0, 1], [9, -9]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);

  const lightX = useTransform(px, [0, 1], [0, 100]);
  const lightY = useTransform(py, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,255,255,0.5), transparent 55%)`;

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !ref.current) return;   // no tilt on touch screens
    const box = ref.current.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ scale: 1.03 }}
      className={`group/tilt relative ${className}`}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ background: glare }}
        className="pointer-events-none absolute inset-0 rounded-frame opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
      />
    </motion.div>
  );
}