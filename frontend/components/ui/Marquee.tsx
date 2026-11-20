const WORDS = ["small shops", "new drops", "hidden gems", "made with love", "discover more"];

export default function Marquee() {
  const row = WORDS.flatMap((word) => [word, "✦"]);

  return (
    <div className="overflow-hidden border-y-2 border-charcoal bg-butter py-3">
      {/* the content is doubled, so moving it by half its width loops without a jump */}
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-3xl">
        {[...row, ...row].map((text, index) => (
          <span key={index}>{text}</span>
        ))}
      </div>
    </div>
  );
}