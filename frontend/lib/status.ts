export const ORDER_LABELS: Record<string, string> = {
  awaiting_payment: "Waiting for payment",
  placed: "Placed",
  processing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PARCEL_LABELS: Record<string, string> = {
  awaiting_payment: "Waiting for payment",
  pending: "Waiting for the shop",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS: Record<string, string> = { cod: "Cash on delivery", esewa: "eSewa" };

// full class names, so Tailwind can see them
export const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-butter",
  pending: "bg-butter",
  placed: "bg-butter",
  confirmed: "bg-lavender",
  packed: "bg-lavender",
  processing: "bg-lavender",
  shipped: "bg-pink",
  delivered: "bg-mint",
  completed: "bg-mint",
  cancelled: "bg-charcoal/15",
};