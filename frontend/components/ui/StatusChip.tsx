import { ORDER_LABELS, PARCEL_LABELS, STATUS_COLORS } from "@/lib/status";

export default function StatusChip({ status, kind }: { status: string; kind: "order" | "parcel" }) {
  const label = (kind === "order" ? ORDER_LABELS : PARCEL_LABELS)[status] ?? status;
  return (
    <span className={`inline-block rounded-full border-2 border-charcoal px-3 py-0.5 text-xs font-bold ${STATUS_COLORS[status] ?? "bg-paper"}`}>
      {label}
    </span>
  );
}