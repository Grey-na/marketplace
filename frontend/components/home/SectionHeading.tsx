import Link from "next/link";

export default function SectionHeading({
  eyebrow, title, text, href, linkLabel,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  text?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <span className="inline-block -rotate-2 rounded-full border-2 border-charcoal bg-butter px-3 py-1 text-xs font-bold uppercase tracking-wide text-charcoal shadow-sticker-sm">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-3 font-display text-5xl leading-none md:text-7xl">{title}</h2>
        {text && <p className="mt-3 max-w-lg">{text}</p>}
      </div>
      {href && (
        <Link href={href} className="font-semibold underline decoration-coral decoration-2 underline-offset-4">
          {linkLabel ?? "See all"} →
        </Link>
      )}
    </div>
  );
}