// what a customer did with a product. The recommendation engine gives each type a weight later
export const INTERACTION_TYPES = ["view", "click", "wishlist", "cart", "purchase"] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];