"use client";

import { useState } from "react";
import Stars from "@/components/ui/Stars";
import { ApiRequestError, apiFetch } from "@/lib/client-api";
import type { MyReview } from "@/types/api";

export default function ReviewBox({
  productId, existing, onChanged,
}: {
  productId: string;
  existing?: MyReview;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (rating < 1) {
      setError("Please choose a rating from 1 to 5 stars.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        await apiFetch(`/customer/reviews/${existing._id}`, { method: "PATCH", body: { rating, comment: comment.trim() || null } });
      } else {
        await apiFetch(`/customer/products/${productId}/reviews`, { method: "POST", body: { rating, comment: comment.trim() || undefined } });
      }
      setEditing(false);
      onChanged();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (caught.fields.rating ?? caught.message) : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await apiFetch(`/customer/reviews/${existing._id}`, { method: "DELETE" });
      setRating(0);
      setComment("");
      onChanged();
    } catch {
      setError("Could not delete your review.");
    } finally {
      setBusy(false);
    }
  };

  // my review is already written
  if (existing && !editing) {
    return (
      <div className="mt-3 rounded-2xl bg-cream p-3 text-sm">
        <Stars rating={existing.rating} />
        {existing.comment && <p className="mt-1">{existing.comment}</p>}
        <div className="mt-2 flex gap-4 font-medium">
          <button type="button" onClick={() => setEditing(true)} className="underline">Edit</button>
          <button type="button" onClick={remove} disabled={busy} className="underline disabled:opacity-50">Delete</button>
        </div>
        {error && <p role="alert" className="mt-1 text-red-700">{error}</p>}
      </div>
    );
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mt-3 rounded-full border-2 border-charcoal bg-butter px-4 py-1 text-sm font-semibold shadow-sticker-sm transition hover:-translate-y-0.5">
        Write a review
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-cream p-3">
      <div role="group" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
            aria-pressed={rating === value}
            className={`text-3xl leading-none transition hover:scale-110 ${value <= rating ? "text-coral" : "text-charcoal/25"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label htmlFor={`comment-${productId}`} className="sr-only">Your review</label>
      <textarea
        id={`comment-${productId}`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="What did you think? (optional)"
        className="mt-2 w-full rounded-2xl border-2 border-charcoal bg-paper px-3 py-2 text-sm outline-none focus:bg-butter/30"
      />
      {error && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-2 flex gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn-sticker !px-4 !py-1.5 text-sm disabled:opacity-60">
          {busy ? "Saving..." : "Save review"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm font-medium underline">Cancel</button>
      </div>
    </div>
  );
}