import { z } from "zod";
import { PAYMENT_METHODS } from "../../types/Order";

export const CheckoutSchema = z.object({
    address: z.object({
        fullName: z.string().trim().min(2, "Full name is too short").max(60, "Full name is too long"),
        phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
        city: z.string().trim().min(2, "City is required").max(60),
        street: z.string().trim().min(3, "Street or area is required").max(150),
        landmark: z.string().trim().max(100).optional(),
    }),
    paymentMethod: z.enum(PAYMENT_METHODS, "Only cash on delivery is available right now"),
    note: z.string().trim().max(300, "Note must be at most 300 characters").optional(),
})
export type CheckoutInput = z.infer<typeof CheckoutSchema>;