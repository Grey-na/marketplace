"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { CARD } from "@/components/dashboard/styles";
import Input from "@/components/ui/form/Input";
import Textarea from "@/components/ui/form/Textarea";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { ProductFormSchema, splitValues, toLines, toList, type ProductFormValues } from "@/lib/validation/seller";
import type { CategoryLite, SellerProduct } from "@/types/api";

// from a saved product to the text boxes of the form (paisa become rupees)
const toFormValues = (product?: SellerProduct): ProductFormValues => ({
  title: product?.title ?? "",
  summary: product?.summary ?? "",
  description: product?.description ?? "",
  price: product ? String(product.price / 100) : "",
  discount: product ? String(product.discount) : "0",
  stock: product ? String(product.stock) : "",
  category: product ? (typeof product.category === "string" ? product.category : product.category?._id ?? "") : "",
  brand: product?.brand ?? "",
  tags: product?.tags.join(", ") ?? "",
  highlights: product?.highlights.join("\n") ?? "",
  shippingPolicy: product?.shippingPolicy ?? "",
  returnPolicy: product?.returnPolicy ?? "",
  attributes: product?.attributes.map((attribute) => ({ name: attribute.name, values: attribute.values.join(", ") })) ?? [],
});

// from the form to what the backend wants (rupees become paisa)
const toPayload = (values: ProductFormValues, editing: boolean) => {
  // an emptied optional text is cleared when editing, and simply left out when creating
  const text = (value: string) => (value.trim() ? value.trim() : editing ? null : undefined);
  return {
    title: values.title,
    summary: values.summary,
    description: text(values.description),
    price: Math.round(Number(values.price) * 100),
    discount: Number(values.discount),
    stock: Number(values.stock),
    category: values.category,
    brand: text(values.brand),
    tags: toList(values.tags),
    highlights: toLines(values.highlights),
    shippingPolicy: text(values.shippingPolicy),
    returnPolicy: text(values.returnPolicy),
    attributes: values.attributes
      .filter((row) => row.name.trim() && row.values.trim())
      .map((row) => ({ name: row.name.trim(), values: splitValues(row.values) })),
  };
};

const FORM_FIELDS = ["title", "summary", "description", "price", "discount", "stock", "category", "brand", "tags", "highlights", "shippingPolicy", "returnPolicy"];

export default function ProductForm({
  categories, product, onSaved,
}: {
  categories: CategoryLite[];
  product?: SellerProduct;
  onSaved: (product: SellerProduct) => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: toFormValues(product),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "attributes" });

  const onSubmit = async (values: ProductFormValues) => {
    setFormError(null);
    setSaved(false);
    try {
      const payload = toPayload(values, Boolean(product));
      if (product) {
        const response = await apiFetch<SellerProduct>(`/seller/products/${product._id}`, { method: "PATCH", body: payload });
        setSaved(true);
        onSaved(response.result);
      } else {
        // created as a draft: the next page has the picture manager and the "Set live" switch
        const response = await apiFetch<SellerProduct>("/seller/products", { method: "POST", body: payload });
        router.push(`/seller/products/${response.result._id}?new=1`);
      }
    } catch (caught) {
      if (!(caught instanceof ApiRequestError)) {
        setFormError("Could not reach the server. Please try again.");
        return;
      }
      let shown = false;
      Object.entries(caught.fields).forEach(([key, message]) => {
        if (FORM_FIELDS.includes(key)) {
          setError(key as keyof ProductFormValues, { message });
          shown = true;
        }
      });
      if (!shown) {
        setFormError(Object.values(caught.fields)[0] ?? caught.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={`${CARD} space-y-5`}>
      {saved && <p role="status" className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold">Saved.</p>}
      {formError && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">{formError}</p>}

      <Input control={control} name="title" label="Title" placeholder="Oversized black hoodie" />
      <Textarea control={control} name="summary" label="Short summary" rows={3} hint="One or two sentences. Customers see this first (20 to 500 characters)." />

      <div className="grid gap-5 sm:grid-cols-3">
        <Input control={control} name="price" label="Price (Rs.)" placeholder="2499" />
        <Input control={control} name="discount" label="Discount (%)" placeholder="0" />
        <Input control={control} name="stock" label="Stock" placeholder="25" />
      </div>

      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-semibold">Category</label>
            <select
              {...field}
              id="category"
              className={`w-full rounded-2xl border-2 bg-paper px-4 py-3 outline-none ${fieldState.error ? "border-red-600" : "border-charcoal"}`}
            >
              <option value="">Choose a category...</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.title}</option>
              ))}
            </select>
            {fieldState.error && <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input control={control} name="brand" label="Brand (optional)" />
        <Input control={control} name="tags" label="Tags (optional)" placeholder="hoodie, streetwear, black" />
      </div>
      <Textarea control={control} name="highlights" label="Highlights (optional)" rows={3} hint="One per line, up to 8. For example: 100% cotton" />
      <Textarea control={control} name="description" label="Full description (optional)" rows={5} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Options like size or color (optional)</legend>
        <p className="text-xs opacity-70">These are shown to customers as information. Stock is counted for the whole product.</p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Input control={control} name={`attributes.${index}.name` as const} label="Option" placeholder="Size" />
              <Input control={control} name={`attributes.${index}.values` as const} label="Values, separated by commas" placeholder="S, M, L, XL" />
            </div>
            <button type="button" onClick={() => remove(index)} aria-label="Remove this option" className="mt-8 grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-charcoal bg-paper hover:bg-pink">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => append({ name: "", values: "" })} className="btn-outline"><Plus size={15} /> Add an option</button>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Textarea control={control} name="shippingPolicy" label="Shipping notes (optional)" rows={3} />
        <Textarea control={control} name="returnPolicy" label="Return notes (optional)" rows={3} />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-solid">
        {isSubmitting ? "Saving..." : product ? "Save changes" : "Save as a draft"}
      </button>
    </form>
  );
}