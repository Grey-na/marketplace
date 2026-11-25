"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { CARD } from "@/components/dashboard/styles";
import ProductBadge from "./ProductBadge";
import ProductForm from "./ProductForm";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import { useApiData } from "@/lib/useApiData";
import type { CategoryLite, SellerProduct } from "@/types/api";

const MAX_IMAGES = 6;

function ImagesPanel({ product, onChanged }: { product: SellerProduct; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_IMAGES - product.images.length;

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > remaining) {
      setError(remaining === 0 ? "This product already has 6 pictures." : `You can add ${remaining} more ${remaining === 1 ? "picture" : "pictures"}.`);
      return;
    }
    const form = new FormData();
    files.forEach((file) => form.append("images", file));

    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/seller/products/${product._id}/images`, { method: "POST", body: form });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.images ?? Object.values(caught.fields)[0] ?? caught.message) : "Could not upload. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (filename: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/seller/products/${product._id}/images/${filename}`, { method: "DELETE" });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.images ?? caught.message) : "Could not remove the picture.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <h2 className="font-display text-2xl">Pictures</h2>
      <p className="text-xs opacity-70">The first picture is the cover. Up to {MAX_IMAGES}, jpg, png, webp, gif or avif, 3 MB each.</p>

      <ul className="mt-4 grid grid-cols-3 gap-3">
        {product.images.map((image, index) => (
          <li key={image.filename} className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-xl border-2 border-charcoal bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={`Picture ${index + 1}`} className="h-full w-full object-cover" />
            </div>
            {index === 0 && <span className="absolute left-1 top-1 rounded-full bg-butter px-2 text-[10px] font-bold">Cover</span>}
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(image.filename)}
              aria-label={`Remove picture ${index + 1}`}
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-charcoal bg-paper hover:bg-pink disabled:opacity-60"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <label className="btn-outline mt-4 cursor-pointer">
          <Upload size={15} /> {busy ? "Uploading..." : "Add pictures"}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={upload} disabled={busy} className="sr-only" />
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}

function StatusPanel({ product, onChanged }: { product: SellerProduct; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = product.status === "active";

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/seller/products/${product._id}`, { method: "PATCH", body: { status: live ? "inactive" : "active" } });
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.status ?? caught.message) : "Could not change the status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Visibility</h2>
        <ProductBadge product={product} />
      </div>

      {product.isBlocked ? (
        <p role="alert" className="mt-3 rounded-xl bg-pink px-4 py-3 text-sm">
          Our team blocked this product, so customers cannot see it.{product.blockReason && <> Reason: <strong>{product.blockReason}</strong></>}
        </p>
      ) : (
        <p className="mt-3 text-sm">
          {live ? "Customers can see and buy this product." : "This is a draft. Add at least one picture, then set it live."}
        </p>
      )}

      <button type="button" onClick={toggle} disabled={busy} className={`${live ? "btn-outline" : "btn-solid"} mt-4`}>
        {busy ? "Working..." : live ? "Back to draft" : "Set live"}
      </button>
      {live && !product.isBlocked && <Link href={`/products/${product.slug}`} className="ml-3 text-sm font-medium underline">See it in the store</Link>}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}

function DeletePanel({ product }: { product: SellerProduct }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/seller/products/${product._id}`, { method: "DELETE" });
      router.push("/seller/products");
    } catch {
      setError("Could not delete the product.");
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <h2 className="font-display text-2xl">Delete</h2>
      {!confirming ? (
        <>
          <p className="mt-2 text-sm">Removing a product also deletes its pictures. Old orders keep their own copy.</p>
          <button type="button" onClick={() => setConfirming(true)} className="btn-outline mt-3 hover:!bg-pink">Delete this product</button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold">Are you sure? This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={remove} disabled={busy} className="btn-solid">{busy ? "Deleting..." : "Yes, delete"}</button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-outline">Keep it</button>
          </div>
        </>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}

export default function ProductEditor({ productId, isNew = false }: { productId?: string; isNew?: boolean }) {
  const { data: categories, error: categoryError, loading: categoriesLoading } = useApiData<CategoryLite[]>("/categories/home?limit=50");
  const { data: product, error, loading, reload, setData } = useApiData<SellerProduct>(productId ? `/seller/products/${productId}` : null);

  if (categoriesLoading || loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-charcoal/10" />;
  }
  if (error || categoryError || !categories || (productId && !product)) {
    return (
      <div role="alert" className={CARD}>
        <p className="font-medium text-red-700">{error ?? categoryError ?? "Could not load this product."}</p>
        <Link href="/seller/products" className="btn-outline mt-3">Back to products</Link>
      </div>
    );
  }
  if (categories.length === 0) {
    return <div className={CARD}><p>The team has not added any categories yet, so products cannot be created. Please check back soon.</p></div>;
  }

  return (
    <div>
      <PageHeader
        title={product ? "Edit product" : "New product"}
        text={product ? product.title : "Start with the basics. You add the pictures on the next page."}
        action={<Link href="/seller/products" className="btn-outline">← All products</Link>}
      />

      {isNew && product && (
        <p role="status" className="mb-6 rounded-2xl border-2 border-charcoal bg-mint px-5 py-3 text-sm font-semibold">
          Saved as a draft. Add at least one picture on the right, then set it live.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* the form is created once, so what you typed is not lost when a picture is added */}
        <ProductForm categories={categories} product={product ?? undefined} onSaved={setData} />

        {product && (
          <div className="space-y-6">
            <ImagesPanel product={product} onChanged={reload} />
            <StatusPanel product={product} onChanged={reload} />
            <DeletePanel product={product} />
          </div>
        )}
      </div>
    </div>
  );
}