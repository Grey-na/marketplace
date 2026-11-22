import Stars from "@/components/ui/Stars";
import type { ReviewData } from "@/types/api";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ReviewList({ reviews }: { reviews: ReviewData[] }) {
  if (reviews.length === 0) {
    return <p className="mt-6">No written reviews yet. People who received this product can review it from their orders.</p>;
  }

  return (
    <ul className="mt-6 grid gap-5 md:grid-cols-2">
      {reviews.map((review) => (
        <li key={review._id} className="rounded-frame border-2 border-charcoal bg-paper p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-charcoal bg-lavender font-bold">
              {(review.user?.fullName ?? "?").charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold leading-tight">{review.user?.fullName ?? "A customer"}</p>
              <p className="text-xs opacity-60">{formatDate(review.createdAt)}</p>
            </div>
            <Stars rating={review.rating} className="ml-auto text-sm" />
          </div>
          {review.comment && <p className="mt-3">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}