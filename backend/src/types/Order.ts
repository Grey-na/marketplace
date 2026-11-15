// most pieces of one product in a cart, and most different products
export const MAX_QTY_PER_ITEM = 10;
export const MAX_CART_ITEMS = 30;

// flat delivery charge for each shop's parcel, in paisa (10000 paisa = Rs. 100).
// The admin delivery settings will replace this later
export const DELIVERY_CHARGE_PAISA = 10000;

export const PAYMENT_METHODS = ["cod"] as const;
export const SHOP_ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
export const DELIVERY_PROVIDERS = ["seller", "in_house", "third_party"] as const;

// the status changes each person may make: "from" status -> the statuses it can move to
export const SELLER_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["packed", "cancelled"],
    packed: ["shipped", "cancelled"],
    shipped: ["delivered"],
};

// a customer can cancel until the seller starts packing
export const CUSTOMER_TRANSITIONS: Record<string, string[]> = {
    pending: ["cancelled"],
    confirmed: ["cancelled"],
};