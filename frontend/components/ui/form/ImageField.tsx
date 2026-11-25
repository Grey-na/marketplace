"use client";

import { useEffect, useState } from "react";

const MAX_SIZE = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export default function ImageField({
  label, current, file, onChange, error, round = false,
}: {
  label: string;
  current?: string | null;       // the picture that is saved now
  file: File | null;             // the new picture the person just chose
  onChange: (file: File | null) => void;
  error?: string | null;
  round?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setLocalError(null);
    if (chosen && !TYPES.includes(chosen.type)) {
      setLocalError("Please choose a jpg, png, webp, gif or avif picture.");
      onChange(null);
      return;
    }
    if (chosen && chosen.size > MAX_SIZE) {
      setLocalError("The picture is larger than 3 MB.");
      onChange(null);
      return;
    }
    onChange(chosen);
  };

  const shown = preview ?? current ?? null;
  const message = localError ?? error;

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className={`relative overflow-hidden border-2 border-dashed border-charcoal bg-cream ${round ? "h-28 w-28 rounded-full" : "h-36 w-full rounded-2xl"}`}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-xs opacity-60">No picture</span>
        )}
      </div>
      <input
        type="file"
        accept={TYPES.join(",")}
        onChange={choose}
        aria-label={label}
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-2 file:border-charcoal file:bg-butter file:px-3 file:py-1 file:text-sm file:font-semibold"
      />
      {message && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{message}</p>}
    </div>
  );
}