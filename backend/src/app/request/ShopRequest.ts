import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalField = <T extends z.ZodType>(rule: T) => z.preprocess(emptyToUndefined, rule.optional());

const nameRule = z.string().trim().min(3, "Shop name must be at least 3 characters").max(60, "Shop name must be at most 60 characters");
const phoneRule = z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number");
const descriptionRule = z.string().trim().max(1000, "Description must be at most 1000 characters");
const emailRule = z.string().trim().toLowerCase().pipe(z.email("Invalid email format"));
const addressRule = z.string().trim().max(200, "Address must be at most 200 characters");
const regNoRule = z.string().trim().max(50, "Registration number must be at most 50 characters");

// seller: create the shop
export const ShopCreateSchema = z.object({
    name: nameRule,
    phone: phoneRule,
    description: optionalField(descriptionRule),
    email: optionalField(emailRule),
    address: optionalField(addressRule),
    businessRegNo: optionalField(regNoRule),
})

// seller: edit the shop (only the fields that are sent change)
export const ShopUpdateSchema = z.object({
    name: optionalField(nameRule),
    phone: optionalField(phoneRule),
    description: optionalField(descriptionRule),
    email: optionalField(emailRule),
    address: optionalField(addressRule),
    businessRegNo: optionalField(regNoRule),
})

// admin: review the shop (JSON body)
export const ShopReviewSchema = z.object({
    status: z.enum(["approved", "rejected", "suspended"], "Status must be approved, rejected or suspended").optional(),
    rejectionReason: z.string().trim().max(300, "Reason must be at most 300 characters").optional(),
    isVerified: z.boolean("isVerified must be true or false").optional(),
    isFeatured: z.boolean("isFeatured must be true or false").optional(),
})
    .refine((d) => Object.keys(d).length > 0, {
        message: "Nothing to update",
    })
    .refine((d) => d.status !== "rejected" || !!d.rejectionReason, {
        path: ["rejectionReason"],
        message: "A reason is required when rejecting a shop",
    })