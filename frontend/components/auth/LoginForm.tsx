"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/form/Input";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginSchema, type LoginValues } from "@/lib/validation/auth";
import { ApiRequestError } from "@/lib/client-api";
import { ROLE_HOME } from "@/lib/auth";

export default function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { user, login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: "", password: "" },
  });

  // once someone is logged in (just now, or already before), leave the login page
  useEffect(() => {
    if (user) {
      router.replace(next ?? ROLE_HOME[user.role]);
    }
  }, [user, next, router]);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFormError(
          error.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : error.message
        );
      } else {
        setFormError("Could not reach the server. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <h2 className="font-display text-4xl">Welcome back</h2>

      {formError && (
        <p role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {formError}
        </p>
      )}

      <Input control={control} name="username" label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
      <Input control={control} name="password" label="Password" type="password" placeholder="Your password" autoComplete="current-password" />

      <button type="submit" disabled={isSubmitting} className="btn-sticker mt-2 disabled:opacity-60">
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}