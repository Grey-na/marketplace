import * as z from "zod";

// "Hoodie, Black, hoodie" -> ["hoodie", "black"]
export const toList = (text: string): string[] =>
  [...new Set(text.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];

// "S, M, L" -> ["S", "M", "L"] (keeps the capital letters)
export const splitValues = (text: string): string[] =>
  [...new Set(text.split(",").map((item) => item.trim()).filter(Boolean))];

// one highlight per line
export const toLines = (text: string): string[] =>
  text.split("\n").map((line) => line.trim()).filter(Boolean);

// ---------- the shop ----------
export const ShopFormSchema = z.object({
  name: z.string().trim().min(3, "Shop name must be at least 3 characters").max(60, "Shop name must be at most 60 characters"),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10 to 15 digits)"),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address"),
  address: z.string().trim().max(200, "Address must be at most 200 characters"),
  description: z.string().trim().max(1000, "Description must be at most 1000 characters"),
  businessRegNo: z.string().trim().max(50, "Registration number must be at most 50 characters"),
});
export type ShopFormValues = z.infer<typeof ShopFormSchema>;

// ---------- a product (the numbers are typed as text, and converted when sending) ----------
export const ProductFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title must be at most 150 characters"),
    summary: z.string().trim().min(20, "Summary must be at least 20 characters").max(500, "Summary must be at most 500 characters"),
    description: z.string().trim().max(2500, "Description must be at most 2500 characters"),
    price: z.string().trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 2499 or 2499.50")
      .refine((value) => Number(value) >= 10, "The lowest price is Rs. 10"),
    discount: z.string().trim()
      .regex(/^\d{1,3}$/, "A whole number from 0 to 100")
      .refine((value) => Number(value) <= 100, "A whole number from 0 to 100"),
    stock: z.string().trim()
      .regex(/^\d{1,6}$/, "A whole number, 0 or more")
      .refine((value) => Number(value) <= 100000, "That is too many"),
    category: z.string().min(1, "Choose a category"),
    brand: z.string().trim().max(60, "Brand must be at most 60 characters"),
    tags: z.string().refine((value) => toList(value).length <= 10, "At most 10 tags"),
    highlights: z.string().refine((value) => toLines(value).length <= 8, "At most 8 highlights"),
    shippingPolicy: z.string().trim().max(500, "At most 500 characters"),
    returnPolicy: z.string().trim().max(500, "At most 500 characters"),
    attributes: z
      .array(z.object({ name: z.string().trim().max(30, "At most 30 characters"), values: z.string().trim().max(300, "At most 300 characters") }))
      .max(10, "At most 10 options")
      .refine((rows) => rows.every((row) => !row.name.trim() || row.values.trim()), "Every option with a name needs at least one value"),
  })
  .refine((v) => Math.round(Number(v.price) * 100 * (1 - Number(v.discount) / 100)) >= 1000, {
    path: ["discount"],
    message: "The price after the discount cannot be below Rs. 10",
  });
export type ProductFormValues = z.infer<typeof ProductFormSchema>;