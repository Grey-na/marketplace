"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  rows?: number;
  placeholder?: string;
  hint?: string;
};

export default function Textarea<T extends FieldValues>({ control, name, label, rows = 4, placeholder, hint }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">{label}</label>
          <textarea
            {...field}
            value={(field.value as string | undefined) ?? ""}
            id={name}
            rows={rows}
            placeholder={placeholder}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
            className={`w-full rounded-2xl border-2 bg-paper px-4 py-3 outline-none transition focus:bg-butter/30 ${
              fieldState.error ? "border-red-600" : "border-charcoal"
            }`}
          />
          {hint && !fieldState.error && <p className="mt-1 text-xs opacity-70">{hint}</p>}
          {fieldState.error && (
            <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}