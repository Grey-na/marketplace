"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import Input from "@/components/ui/form/Input";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";
import { CheckoutSchema, type CheckoutValues } from "@/lib/validation/checkout";
import type { CartView, OrderData } from "@/types/api";

const METHODS = [
  { value: "cod", title: "Cash on delivery", text: "Pay when your parcels arrive", active: "bg-mint" },
  { value: "esewa", title: "eSewa", text: "Pay now, safely online", active: "bg-butter" },
] as const;

const FIELDS = ["fullName", "phone", "city", "street", "landmark", "note", "paymentMethod"];

type CheckoutResult = { order: OrderData; payment: { payUrl: string } | null };

export default function CheckoutContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCount } = useCart();
  const { data: cart, error, loading } = useApiData<CartView>("/customer/cart");
  const [formError, setFormError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const { control, handleSubmit, setError, watch, formState: { isSubmitting } } = useForm<CheckoutValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      city: "",
      street: "",
      landmark: "",
      note: "",
      paymentMethod: "cod",
    },
  });
  const method = watch("paymentMethod");

  // nothing to buy: back to the cart
  useEffect(() => {
    if (!loading && cart && cart.itemCount === 0) {
      router.replace("/cart");
    }
  }, [loading, cart, router]);

  const onSubmit = async (values: CheckoutValues) => {
    setFormError(null);
    setProblems([]);
    try {
      const response = await apiFetch<CheckoutResult>("/customer/checkout", {
        method: "POST",
        body: {
          address: {
            fullName: values.fullName,
            phone: values.phone,
            city: values.city,
            street: values.street,
            landmark: values.landmark || undefined,
          },
          paymentMethod: values.paymentMethod,
          note: values.note || undefined,
        },
      });
      setCount(0);

      const { order, payment } = response.result;
      if (payment?.payUrl) {
        // online payment: go to eSewa. The browser leaves the website for a moment
        window.location.href = payment.payUrl;
        return;
      }
      router.push(`/orders/${order._id}?placed=1`);
    } catch (caught) {
      if (!(caught instanceof ApiRequestError)) {
        setFormError("Could not reach the server. Please try again.");
        return;
      }
      if (caught.status === 409) {
        // something in the cart changed (stock, availability)
        setProblems(Object.values(caught.fields));
        setFormError("Some items in your cart changed.");
        return;
      }
      let shown = false;
      Object.entries(caught.fields).forEach(([key, message]) => {
        const field = key.replace(/^address\./, "");
        if (FIELDS.includes(field)) {
          setError(field as keyof CheckoutValues, { message });
          shown = true;
        }
      });
      if (!shown) {
        setFormError(caught.fields.cart ?? caught.message);
      }
    }
  };

  if (loading) {
    return <div className="mt-10 h-72 animate-pulse rounded-frame bg-charcoal/10" />;
  }
  if (error || !cart) {
    return <p role="alert" className="mt-10 font-medium text-red-700">{error ?? "Could not load your cart."}</p>;
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-frame border-2 border-charcoal bg-paper p-6 md:p-8">
        <h2 className="font-display text-3xl">Where should it go?</h2>

        {formError && (
          <div role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <p>{formError}</p>
            {problems.length > 0 && <ul className="mt-1 list-disc pl-5">{problems.map((text) => <li key={text}>{text}</li>)}</ul>}
            {(caughtCartProblem(problems) || problems.length > 0) && <Link href="/cart" className="mt-2 inline-block underline">Review your cart</Link>}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Input control={control} name="fullName" label="Full name" autoComplete="name" />
          <Input control={control} name="phone" label="Phone number" type="tel" autoComplete="tel" />
          <Input control={control} name="city" label="City" autoComplete="address-level2" />
          <Input control={control} name="street" label="Street or area" autoComplete="street-address" />
        </div>
        <Input control={control} name="landmark" label="Landmark (optional)" placeholder="Near the temple, blue gate..." />
        <Input control={control} name="note" label="Note for the shops (optional)" />

        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">How do you want to pay?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {METHODS.map((option) => {
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
                      <span className="block font-display text-2xl leading-none">{option.title}</span>
                      <span className="mt-1 block text-xs">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        <button type="submit" disabled={isSubmitting || cart.hasProblems} className="btn-sticker w-full disabled:opacity-60">
          {isSubmitting ? "Working..." : method === "esewa" ? "Continue to eSewa" : "Place order"}
        </button>
        {cart.hasProblems && <p className="text-sm font-semibold text-red-700">Some items in your cart need attention. <Link href="/cart" className="underline">Go to the cart</Link></p>}
      </form>

      <aside className="h-fit rounded-frame border-2 border-charcoal bg-butter p-6 shadow-sticker lg:sticky lg:top-28">
        <h2 className="font-display text-3xl">Your order</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {cart.items.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span>{line.title} × {line.quantity}</span>
              <span className="shrink-0">{formatPrice(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t-2 border-charcoal pt-4">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery ({cart.shopCount} {cart.shopCount === 1 ? "parcel" : "parcels"})</dt><dd>{formatPrice(cart.deliveryCharge)}</dd></div>
          <div className="flex justify-between text-xl font-bold"><dt>Total</dt><dd>{formatPrice(cart.total)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

// the cart error from the backend ("Your cart is empty") also deserves a link back to the cart
const caughtCartProblem = (problems: string[]) => problems.length === 0 ? false : true;