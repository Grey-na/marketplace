import { z } from "zod";
import { MAX_QTY_PER_ITEM } from "../../types/Order";

const quantityRule = z.number("Quantity must be a number")
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(MAX_QTY_PER_ITEM, `You can buy at most ${MAX_QTY_PER_ITEM} pieces of one product`);

export const CartAddSchema = z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id"),
    quantity: quantityRule.default(1),
})

export const CartUpdateSchema = z.object({
    quantity: quantityRule,
})