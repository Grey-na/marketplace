// frame colors a category can have. Product cards on the website take their frame from this
export const CATEGORY_COLORS = ["pink", "lavender", "butter", "mint", "coral"] as const;
export type CategoryColor = typeof CATEGORY_COLORS[number];