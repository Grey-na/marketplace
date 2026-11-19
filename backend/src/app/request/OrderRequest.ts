import { z } from "zod";
import { PAYMENT_METHODS, DELIVERY_PROVIDERS } from "../../types/Order";

export const CheckoutSchema = z.object({
    address: z.object({
        fullName: z.string().trim().min(2, "Full name is too short").max(60, "Full name is too long"),
        phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
        city: z.string().trim().min(2, "City is required").max(60),
        street: z.string().trim().min(3, "Street or area is required").max(150),
        landmark: z.string().trim().max(100).optional(),
    }),
        paymentMethod: z.enum(PAYMENT_METHODS, "Payment method must be cod or esewa"),
    note: z.string().trim().max(300, "Note must be at most 300 characters").optional(),
})
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

// seller: move a parcel to the next status
export const ShopOrderStatusSchema = z.object({
    status: z.enum(["confirmed", "packed", "shipped", "delivered", "cancelled"], "Invalid status"),
    note: z.string().trim().max(300, "Note must be at most 300 characters").optional(),
    // only used when the status is "shipped"
    trackingNo: z.string().trim().max(60, "Tracking number is too long").optional(),
    provider: z.enum(DELIVERY_PROVIDERS, "Provider must be seller, in_house or third_party").optional(),
}).refine((d) => d.status !== "cancelled" || !!d.note, {
    path: ["note"],
    message: "Please give a reason for cancelling",
})

// customer: cancel a parcel
export const CustomerCancelSchema = z.object({
    reason: z.string().trim().max(300, "Reason must be at most 300 characters").optional(),
})

// admin: mark a refund as done (after refunding in the eSewa merchant portal)
export const RefundDoneSchema = z.object({
    note: z.string().trim().max(300, "Note must be at most 300 characters").optional(),
})
