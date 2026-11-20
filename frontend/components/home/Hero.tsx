"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import HeroSceneLoader from "@/components/three/HeroSceneLoader";
import type { SceneCategory } from "@/components/three/HeroScene";

const LINES = ["Find the shops", "nobody told", "you about."];

// shown if the backend has no categories yet
const DEFAULT_CATEGORIES: SceneCategory[] = [
  { slug: "", title: "Streetwear", color: "lavender" },
  { slug: "", title: "Home & Living", color: "mint" },
  { slug: "", title: "Beauty", color: "pink" },
  { slug: "", title: "Accessories", color: "butter" },
];

export default function Hero({ categories }: { categories: SceneCategory[] }) {
  // where is the mouse inside the hero? from -0.5 (left/top) to 0.5 (right/bottom)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { stiffness: 60, damping: 15 });
  const y = useSpring(mouseY, { stiffness: 60, damping: 15 });

  // each sticker moves by a different amount, which creates the feeling of depth
  const starX = useTransform(x, [-0.5, 0.5], [-45, 45]);
  const starY = useTransform(y, [-0.5, 0.5], [-30, 30]);
  const badgeX = useTransform(x, [-0.5, 0.5], [30, -30]);
  const badgeY = useTransform(y, [-0.5, 0.5], [20, -20]);
  const sparkX = useTransform(x, [-0.5, 0.5], [-70, 70]);
  const sparkY = useTransform(y, [-0.5, 0.5], [-50, 50]);

  const onMove = (event: React.MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - box.left) / box.width - 0.5);
    mouseY.set((event.clientY - box.top) / box.height - 0.5);
  };

  return (
    <section onMouseMove={onMove} className="relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col md:min-h-[88vh]">
        {/* the 3D scene fills the hero on wide screens, and sits below the text on phones */}
        <div className="relative order-2 h-[460px] md:absolute md:inset-0 md:order-none md:h-auto">
          <HeroSceneLoader categories={categories.length > 0 ? categories : DEFAULT_CATEGORIES} />
        </div>

        <div className="relative z-10 px-6 pb-8 pt-14 md:pointer-events-none md:px-10 md:pt-24">
          <h1 className="font-display text-6xl leading-[0.95] md:text-8xl">
            {LINES.map((line, index) => (
              <span key={line} className="block overflow-hidden pb-2">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {index === 2 ? <em>{line}</em> : line}
                </motion.span>
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-md text-lg">
            Small shops, big ideas. Hover the island, pick a world, and discover who made it.
          </p>
          <a href="#trending" className="btn-sticker pointer-events-auto mt-8">Start exploring</a>
        </div>

        {/* stickers that follow the mouse */}
        <motion.div style={{ x: starX, y: starY }} className="pointer-events-none absolute left-[41%] top-[68%] hidden md:block">
          <motion.svg
            width="84" height="84" viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
          >
            <path d="M50 4 L62 36 L96 38 L69 59 L79 92 L50 73 L21 92 L31 59 L4 38 L38 36 Z" fill="#F6D96B" stroke="#242424" strokeWidth="3" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
        <motion.div style={{ x: badgeX, y: badgeY }} className="pointer-events-none absolute right-[10%] top-[12%] hidden md:block">
          <div className="grid h-24 w-24 -rotate-12 place-items-center rounded-full border-2 border-charcoal bg-coral text-center text-sm font-bold leading-tight text-paper shadow-sticker">
            new<br />drops
          </div>
        </motion.div>
        <motion.div style={{ x: sparkX, y: sparkY }} className="pointer-events-none absolute left-[46%] top-[16%] hidden font-display text-6xl text-coral md:block">
          ✦
        </motion.div>
      </div>
    </section>
  );
}