"use client";

import { useState } from "react";
import RemoteImage from "@/components/ui/RemoteImage";

export default function ProductGallery({ images, title }: { images: { url: string }[]; title: string }) {
  const [active, setActive] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/5] place-items-center rounded-frame border-2 border-charcoal bg-paper text-charcoal/40 shadow-sticker">
        No picture yet
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  // the zoom grows from the point where the mouse is
  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div>
      <div
        onMouseMove={onMove}
        className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-frame border-2 border-charcoal bg-paper shadow-sticker"
      >
        <RemoteImage
          src={current.url}
          alt={title}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.8]"
          style={{ transformOrigin: origin }}
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show picture ${index + 1}`}
              aria-current={index === active}
              className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                index === active ? "border-charcoal shadow-sticker-sm" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <RemoteImage src={image.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}