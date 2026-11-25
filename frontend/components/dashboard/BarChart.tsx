import { formatPrice } from "@/lib/format";

export type DailyPoint = { date: string; orders: number; revenue: number };

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function BarChart({ data, label }: { data: DailyPoint[]; label: string }) {
  const width = 700;
  const height = 230;
  const top = 24;
  const bottom = 30;
  const max = Math.max(1, ...data.map((point) => point.revenue));
  const slot = width / Math.max(1, data.length);
  const barWidth = slot * 0.62;
  const chartHeight = height - top - bottom;

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
        <line x1="0" x2={width} y1={height - bottom} y2={height - bottom} className="stroke-charcoal" strokeWidth="2" />
        {data.map((point, index) => {
          const barHeight = (point.revenue / max) * chartHeight;
          const x = index * slot + (slot - barWidth) / 2;
          const y = height - bottom - barHeight;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, point.orders > 0 ? 3 : 0)}
                rx="6"
                className="fill-lavender stroke-charcoal"
                strokeWidth="2"
              >
                <title>{`${shortDate(point.date)}: ${point.orders} orders, ${formatPrice(point.revenue)}`}</title>
              </rect>
              {point.orders > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-charcoal text-[13px] font-semibold">
                  {point.orders}
                </text>
              )}
              {index % 2 === 0 && (
                <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-charcoal/70 text-[12px]">
                  {shortDate(point.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <ul>
          {data.map((point) => (
            <li key={point.date}>{shortDate(point.date)}: {point.orders} orders, {formatPrice(point.revenue)}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}