import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListing from "@/components/product/ProductListing";
import { apiGet } from "@/lib/api";
import { frameFor } from "@/lib/frames";
import { SITE_NAME } from "@/lib/site";
import type { CategoryLite } from "@/types/api";

const findCategory = async (slug: string) => {
  const categories = await apiGet<CategoryLite[]>("/categories/home?limit=50", { revalidate: 60 });
  return categories.result.find((category) => category.slug === slug);
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  return { title: category ? `${category.title} | ${SITE_NAME}` : SITE_NAME };
}

export default async function CategoryPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;

  const category = await findCategory(slug);
  if (!category) {
    notFound();
  }

  return (
    <main>
      {/* a header in the color of the category */}
      <section className={`border-b-2 border-charcoal ${frameFor(category.color)}`}>
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
          <p className="text-sm font-bold uppercase tracking-wide">Category</p>
          <h1 className="font-display text-6xl leading-none md:text-8xl">{category.title}</h1>
        </div>
      </section>
      <ProductListing searchParams={raw} basePath={`/category/${slug}`} fixedCategory={slug} />
    </main>
  );
}