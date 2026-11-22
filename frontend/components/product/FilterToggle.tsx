"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export default function FilterToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn-sticker mb-4 w-full gap-2 md:hidden">
        <SlidersHorizontal size={18} /> Filters
      </button>
      <div className={`${open ? "block" : "hidden"} md:block`}>{children}</div>
    </div>
  );
}