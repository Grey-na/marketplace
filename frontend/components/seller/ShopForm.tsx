"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "@/components/dashboard/PageHeader";
import { CARD } from "@/components/dashboard/styles";
import ImageField from "@/components/ui/form/ImageField";
import Input from "@/components/ui/form/Input";
import Textarea from "@/components/ui/form/Textarea";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { useApiData } from "@/lib/useApiData";
import { ShopFormSchema, type ShopFormValues } from "@/lib/validation/seller";
import type { SellerShop } from "@/types/api";

function StatusNote({ shop }: { shop: SellerShop }) {
  if (shop.status === "approved") {
    return (
      <p role="status" className="rounded-2xl border-2 border-charcoal bg-mint px-5 py-3 text-sm font-semibold">
        Your shop is live{shop.isVerified ? " and verified ✦" : ""}. <Link href={`/shops/${shop.slug}`} className="underline">See it as a customer</Link>
      </p>
    );
  }
  if (shop.status === "pending") {
    return <p role="status" className="rounded-2xl border-2 border-charcoal bg-butter px-5 py-3 text-sm font-semibold">Your shop is being reviewed. You can still improve the details below.</p>;
  }
  if (shop.status === "rejected") {
    return (
      <div role="alert" className="rounded-2xl border-2 border-charcoal bg-pink px-5 py-3 text-sm">
        <p className="font-semibold">Your shop was not approved.</p>
        {shop.rejectionReason && <p className="mt-1">Reason: {shop.rejectionReason}</p>}
        <p className="mt-1">Fix it below and save. It goes back for review.</p>
      </div>
    );
  }
  return <p role="alert" className="rounded-2xl border-2 border-charcoal bg-pink px-5 py-3 text-sm font-semibold">Your shop is suspended. Please contact support.</p>;
}

function ShopFormInner({ shop, onSaved }: { shop: SellerShop | null; onSaved: () => void }) {
  const suspended = shop?.status === "suspended";
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<{ logo?: string; cover?: string }>({});
  const [saved, setSaved] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm<ShopFormValues>({
    resolver: zodResolver(ShopFormSchema),
    defaultValues: {
      name: shop?.name ?? "",
      phone: shop?.contact?.phone ?? "",
      email: shop?.contact?.email ?? "",
      address: shop?.contact?.address ?? "",
      description: shop?.description ?? "",
      businessRegNo: shop?.businessRegNo ?? "",
    },
  });

  const onSubmit = async (values: ShopFormValues) => {
    setFormError(null);
    setSaved(null);
    setFileErrors({});

    // text and pictures travel together as a "form"
    const form = new FormData();
    form.append("name", values.name);
    form.append("phone", values.phone);
    (["email", "address", "description", "businessRegNo"] as const).forEach((key) => {
      if (values[key]) form.append(key, values[key]);
    });
    if (logo) form.append("logo", logo);
    if (cover) form.append("cover", cover);

    try {
      await apiFetch("/seller/shop", { method: shop ? "PATCH" : "POST", body: form });
      setLogo(null);
      setCover(null);
      setSaved(shop ? "Saved." : "Your shop was created and is waiting for approval.");
      onSaved();
    } catch (caught) {
      if (!(caught instanceof ApiRequestError)) {
        setFormError("Could not reach the server. Please try again.");
        return;
      }
      let shown = false;
      Object.entries(caught.fields).forEach(([key, message]) => {
        if (key === "logo" || key === "cover") {
          setFileErrors((previous) => ({ ...previous, [key]: message }));
          shown = true;
        } else if (key in values) {
          setError(key as keyof ShopFormValues, { message });
          shown = true;
        }
      });
      if (!shown) setFormError(caught.message);
    }
  };

  return (
    <div>
      <PageHeader title={shop ? "My shop" : "Open your shop"} text="This is what customers see on your shop page." />
      {shop && <div className="mb-6"><StatusNote shop={shop} /></div>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className={`${CARD} space-y-5`}>
        {saved && <p role="status" className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold">{saved}</p>}
        {formError && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">{formError}</p>}

        <fieldset disabled={suspended} className="space-y-5">
          <div className="grid gap-6 md:grid-cols-[8rem_1fr]">
            <ImageField label="Logo" round current={shop?.logo?.url} file={logo} onChange={setLogo} error={fileErrors.logo} />
            <ImageField label="Cover picture" current={shop?.cover?.url} file={cover} onChange={setCover} error={fileErrors.cover} />
          </div>

          <Input control={control} name="name" label="Shop name" />
          <Textarea control={control} name="description" label="About your shop" rows={4} hint="Tell customers what you make and what makes it special." />
          <div className="grid gap-5 md:grid-cols-2">
            <Input control={control} name="phone" label="Phone number" type="tel" />
            <Input control={control} name="email" label="Shop email (optional)" type="email" />
          </div>
          <Input control={control} name="address" label="Address (optional)" />
          <Input control={control} name="businessRegNo" label="Business registration number (optional)" placeholder="Only our team can see this" />
        </fieldset>

        <button type="submit" disabled={isSubmitting || suspended} className="btn-solid">
          {isSubmitting ? "Saving..." : shop ? "Save changes" : "Create my shop"}
        </button>
      </form>
    </div>
  );
}

export default function ShopForm() {
  const { data: shop, error, loading, reload } = useApiData<SellerShop>("/seller/shop");
  const noShopYet = error === "You have not created a shop yet";

  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-charcoal/10" />;
  if (error && !noShopYet) return <p role="alert" className="font-medium text-red-700">{error}</p>;

  return <ShopFormInner shop={shop} onSaved={reload} />;
}