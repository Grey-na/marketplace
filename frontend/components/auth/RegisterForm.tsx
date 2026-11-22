"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/form/Input";
import { useAuth } from "@/components/auth/AuthProvider";
import { RegisterSchema, type RegisterValues } from "@/lib/validation/auth";
import { ApiRequestError } from "@/lib/client-api";
import { ROLE_HOME } from "@/lib/auth";

// the two big cards (the classes are written in full, so Tailwind can see them)
const ROLES = [
  { value: "customer", title: "Shop", text: "Discover and buy from small shops", active: "bg-mint" },
  { value: "seller", title: "Sell", text: "Open your own shop here", active: "bg-pink" },
] as const;

export default function RegisterForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { user, register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { fullName: "", username: "", phone: "", password: "", confirmPassword: "", role: "customer" },
  });

  useEffect(() => {
    if (user) {
      router.replace(next ?? ROLE_HOME[user.role]);
    }
  }, [user, next, router]);

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await register(values);
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setFormError("Could not reach the server. Please try again.");
        return;
      }
      // the backend names the field that is wrong: show its message under that field
      let shown = false;
      Object.entries(error.fields).forEach(([field, message]) => {
        if (field in values) {
          const text = field === "username" && message.includes("unique") ? "This email is already registered" : message;
          setError(field as keyof RegisterValues, { message: text });
          shown = true;
        }
      });
      if (!shown) {
        setFormError(error.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : error.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <h2 className="font-display text-4xl">Create your account</h2>

      {formError && (
        <p role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {formError}
        </p>
      )}

      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">I want to</legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((option) => {
                const selected = field.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => field.onChange(option.value)}
                    className={`rounded-2xl border-2 border-charcoal p-4 text-left transition ${
                      selected ? `${option.active} -translate-y-0.5 shadow-sticker` : "bg-paper hover:bg-butter/30"
                    }`}
                  >
                    <span className="block font-display text-3xl leading-none">{option.title}</span>
                    <span className="mt-1 block text-xs">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      />

      <Input control={control} name="fullName" label="Full name" placeholder="Your name" autoComplete="name" />
      <Input control={control} name="username" label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
      <Input control={control} name="phone" label="Phone number" type="tel" placeholder="98XXXXXXXX" autoComplete="tel" />
      <Input control={control} name="password" label="Password" type="password" placeholder="Create a password" autoComplete="new-password" />
      <Input control={control} name="confirmPassword" label="Confirm password" type="password" placeholder="Type it again" autoComplete="new-password" />

      <button type="submit" disabled={isSubmitting} className="btn-sticker mt-2 disabled:opacity-60">
        {isSubmitting ? "Creating your account..." : "Create account"}
      </button>
    </form>
  );
}