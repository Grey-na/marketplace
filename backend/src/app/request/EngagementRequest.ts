import { z } from "zod";

const ratingRule = z.number("Rating must be a number")
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5");
const commentRule = z.string().trim().max(1000, "Comment must be at most 1000 characters");

export const ReviewCreateSchema = z.object({
    rating: ratingRule,
    comment: commentRule.optional(),
})

export const ReviewUpdateSchema = z.object({
    rating: ratingRule.optional(),
    comment: commentRule.nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, {
    message: "Nothing to update",
})

// the browser reports only views and clicks. wishlist, cart and purchase are logged by the server itself
export const TrackSchema = z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id"),
    type: z.enum(["view", "click"], "Type must be view or click"),
    anonId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, "anonId must be 8-64 letters, digits, - or _").optional(),
})