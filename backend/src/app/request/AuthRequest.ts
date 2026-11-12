import { z } from "zod";

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,32}$/;

// trim and lowercase first, then check that it looks like an email
const usernameRule = z.string().trim().toLowerCase().pipe(z.email("Invalid email format"));

export const RegistrationSchema = z.object({
    fullName: z.string().trim().min(2, "Full name is too short").max(50, "Full name is too long"),
    username: usernameRule,
    password: z.string().regex(passwordRegex, "Password must be 8-32 characters with an uppercase letter, a lowercase letter, a number and a special character"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    // nobody can register as admin. Only customer or seller.
    role: z.enum(["customer", "seller"], "Role must be customer or seller").default("customer"),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
}).refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password and confirm password must match",
})

export const LoginSchema = z.object({
    username: usernameRule,
    password: z.string().min(1, "Password is required"),
})