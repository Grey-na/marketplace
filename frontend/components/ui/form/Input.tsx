"use client";

import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: "text" | "email" | "password" | "tel";
  placeholder?: string;
  autoComplete?: string;
};

export default function Input<T extends FieldValues>({
  control, name, label, type = "text", placeholder, autoComplete,
}: Props<T>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">{label}</label>
          <div className="relative">
            <input
              {...field}
              value={(field.value as string | undefined) ?? ""}
              id={name}
              type={isPassword && show ? "text" : type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? `${name}-error` : undefined}
              className={`w-full rounded-2xl border-2 bg-paper px-4 py-3 outline-none transition focus:bg-butter/30 focus:shadow-sticker-sm ${
                fieldState.error ? "border-red-600" : "border-charcoal"
              } ${isPassword ? "pr-12" : ""}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 transition hover:opacity-100"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
          {fieldState.error && (
            <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}