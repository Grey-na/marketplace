// Tailwind only creates classes it can SEE written out in full.
// So we list them, instead of building "bg-" + color
const FRAME_BG: Record<string, string> = {
  pink: "bg-pink",
  lavender: "bg-lavender",
  butter: "bg-butter",
  mint: "bg-mint",
  coral: "bg-coral",
};

export const frameFor = (color?: string): string => FRAME_BG[color ?? ""] ?? "bg-lavender";