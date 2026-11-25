export default function StatCard({
  label, value, hint, accent = "border-t-lavender",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;        // for example "border-t-mint" (written in full, so Tailwind can see it)
}) {
  return (
    <div className={`rounded-2xl border border-charcoal/20 border-t-4 bg-paper p-5 ${accent}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="mt-1 font-display text-4xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs opacity-70">{hint}</p>}
    </div>
  );
}