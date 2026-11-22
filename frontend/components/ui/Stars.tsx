// five stars, with as many colored as the rating
export default function Stars({ rating, className = "text-base" }: { rating: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className={`${className} tracking-tight`} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span className="text-coral">{"★".repeat(full)}</span>
      <span className="text-charcoal/25">{"★".repeat(5 - full)}</span>
    </span>
  );
}