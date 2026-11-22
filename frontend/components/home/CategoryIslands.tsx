import Link from "next/link";
import RemoteImage from "@/components/ui/RemoteImage";
import { frameFor } from "@/lib/frames";
import type { CategoryLite } from "@/types/api";

// each tile gets a different shape, height and offset, so the grid feels hand-placed.
// (the classes are written in full, so Tailwind can see them)
const SHAPES = [
  "rounded-[3rem_1rem_3rem_1rem]",
  "rounded-[1rem_3rem_1rem_3rem]",
  "rounded-[4rem_1rem_1rem_4rem]",
  "rounded-[1rem_4rem_4rem_1rem]",
];
const SIZES = ["md:h-72", "md:mt-12 md:h-64", "md:mt-4 md:h-80", "md:mt-16 md:h-60"];

export default function CategoryIslands({ categories }: { categories: CategoryLite[] }) {
  if (categories.length === 0) {
    return <p>Categories will show up here once the admin adds some.</p>;
  }

  return (
    <div className="grid grid-cols-2 items-start gap-5 md:grid-cols-4 md:gap-6">
      {categories.slice(0, 8).map((category, index) => (
        <Link
          key={category._id}
          href={`/category/${category.slug}`}
          className={`group relative flex h-48 flex-col justify-between overflow-hidden border-2 border-charcoal p-5 shadow-sticker transition duration-300 hover:-rotate-2 hover:scale-[1.03] ${frameFor(category.color)} ${SHAPES[index % 4]} ${SIZES[index % 4]}`}
        >
          <h3 className="font-display text-3xl leading-none md:text-4xl">{category.title}</h3>

          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold">Explore →</span>
            {category.image?.url ? (
              <span className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-charcoal bg-paper transition duration-300 group-hover:rotate-12">
                <RemoteImage src={category.image.url} alt="" fill sizes="80px" className="object-cover" />
              </span>
            ) : (
              <span aria-hidden className="font-display text-6xl leading-none opacity-30">
                {category.title.charAt(0)}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}