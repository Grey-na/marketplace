import * as z from "zod";

export const CheckoutSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(60, "Full name is too long"),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10 to 15 digits)"),
  city: z.string().trim().min(2, "City is required").max(60, "City is too long"),
  street: z.string().trim().min(3, "Street or area is required").max(150, "Address is too long"),
  landmark: z.string().trim().max(100, "Landmark is too long"),
  note: z.string().trim().max(300, "Note must be at most 300 characters"),
  paymentMethod: z.enum(["cod", "esewa"]),
});
export type CheckoutValues = z.infer<typeof CheckoutSchema>;