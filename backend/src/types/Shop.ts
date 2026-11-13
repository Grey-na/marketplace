export const SHOP_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type ShopStatus = typeof SHOP_STATUSES[number];