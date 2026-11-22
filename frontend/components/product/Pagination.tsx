import Link from "next/link";

// 1 ... 4 5 6 ... 12: the first, the last, and the pages around the current one
const pagesToShow = (page: number, total: number): Array<number | "gap"> => {
  const wanted = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((number, index) => {
    if (index > 0 && number - sorted[index - 1] > 1) result.push("gap");
    result.push(number);
  });
  return result;
};

const base = "grid h-11 min-w-11 place-items-center rounded-full border-2 border-charcoal px-3 text-sm font-semibold transition";

export default function Pagination({
  page, totalPages, hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={hrefFor(page - 1)} className={`${base} bg-paper hover:bg-butter`}>← Prev</Link>}

      {pagesToShow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1">…</span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${base} ${item === page ? "bg-charcoal text-cream" : "bg-paper hover:bg-butter"}`}
          >
            {item}
          </Link>
        )
      )}

      {page < totalPages && <Link href={hrefFor(page + 1)} className={`${base} bg-paper hover:bg-butter`}>Next →</Link>}
    </nav>
  );
}