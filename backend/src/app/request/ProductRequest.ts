import { z } from "zod";
import { MIN_PRICE_PAISA } from "../../types/Product";

const objectIdRule = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const titleRule = z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title must be at most 150 characters");
const summaryRule = z.string().trim().min(20, "Summary must be at least 20 characters").max(500, "Summary must be at most 500 characters");
const descriptionRule = z.string().trim().max(2500, "Description must be at most 2500 characters");
const priceRule = z.number("Price must be a number")
    .int("Price must be a whole number of paisa")
    .min(MIN_PRICE_PAISA, `Price must be at least ${MIN_PRICE_PAISA} paisa (Rs. ${MIN_PRICE_PAISA / 100})`);
const discountRule = z.number("Discount must be a number").min(0, "Discount cannot be negative").max(100, "Discount cannot be more than 100");
const stockRule = z.number("Stock must be a number").int("Stock must be a whole number").min(0, "Stock cannot be negative").max(100000, "Stock is too large");
const brandRule = z.string().trim().min(1, "Brand cannot be empty").max(60, "Brand must be at most 60 characters");
// lowercase, and duplicates removed: ["Hoodie", "hoodie"] becomes ["hoodie"]
const tagsRule = z.array(z.string().trim().toLowerCase().min(1, "A tag cannot be empty").max(30, "A tag must be at most 30 characters"))
    .max(10, "At most 10 tags")
    .transform((tags) => [...new Set(tags)]);
const attributesRule = z.array(z.object({
    name: z.string().trim().min(1, "Attribute name is required").max(30),
    values: z.array(z.string().trim().min(1).max(30)).min(1, "Add at least one value").max(20),
})).max(10, "At most 10 attributes");
const highlightsRule = z.array(z.string().trim().min(1).max(200)).max(8, "At most 8 highlights");
const policyRule = z.string().trim().max(500, "Policy must be at most 500 characters");

// seller: create a product (it starts as an inactive draft)
export const ProductCreateSchema = z.object({
    title: titleRule,
    summary: summaryRule,
    description: descriptionRule.optional(),
    price: priceRule,
    discount: discountRule.default(0),
    stock: stockRule,
    category: objectIdRule,
    brand: brandRule.optional(),
    tags: tagsRule.default([]),
    attributes: attributesRule.default([]),
    highlights: highlightsRule.default([]),
    shippingPolicy: policyRule.optional(),
    returnPolicy: policyRule.optional(),
})
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

// seller: edit a product (only the fields that are sent change. null clears an optional text field)
export const ProductUpdateSchema = z.object({
    title: titleRule.optional(),
    summary: summaryRule.optional(),
    description: descriptionRule.nullable().optional(),
    price: priceRule.optional(),
    discount: discountRule.optional(),
    stock: stockRule.optional(),
    category: objectIdRule.optional(),
    brand: brandRule.nullable().optional(),
    tags: tagsRule.optional(),
    attributes: attributesRule.optional(),
    highlights: highlightsRule.optional(),
    shippingPolicy: policyRule.nullable().optional(),
    returnPolicy: policyRule.nullable().optional(),
    status: z.enum(["active", "inactive"], "Status can be active or inactive").optional(),
}).refine((d) => Object.keys(d).length > 0, {
    message: "Nothing to update",
})
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

// admin: block, unblock or feature a product
export const ProductReviewSchema = z.object({
    isBlocked: z.boolean("isBlocked must be true or false").optional(),
    blockReason: z.string().trim().max(300, "Reason must be at most 300 characters").optional(),
    isFeatured: z.boolean("isFeatured must be true or false").optional(),
})
    .refine((d) => Object.keys(d).length > 0, {
        message: "Nothing to update",
    })
    .refine((d) => d.isBlocked !== true || !!d.blockReason, {
        path: ["blockReason"],
        message: "A reason is required when blocking a product",
    })