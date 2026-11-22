import * as z from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,32}$/;

export const LoginSchema = z.object({
  username: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is too short").max(50, "Full name is too long"),
    username: z.email("Enter a valid email address"),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10 to 15 digits)"),
    password: z
      .string()
      .regex(passwordRegex, "8-32 characters with an uppercase letter, a lowercase letter, a number and a symbol"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["customer", "seller"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterValues = z.infer<typeof RegisterSchema>;