import Hero from "@/components/home/Hero";
import Marquee from "@/components/ui/Marquee";
import ProductCard from "@/components/product/ProductCard";
import { apiGet } from "@/lib/api";
import type { CategoryLite, ProductCardData } from "@/types/api";

type HomeData = {
  personalized: boolean;
  forYou: ProductCardData[];
  trending: ProductCardData[];
  hiddenGems: ProductCardData[];
};

export default async function HomePage() {
  const [home, categories] = await Promise.all([
    apiGet<HomeData>("/recommendations/home?limit=8"),
    apiGet<CategoryLite[]>("/categories/home?limit=4"),
  ]);

  const sceneCategories = categories.result.map((category) => ({
    slug: category.slug,
    title: category.title,
    color: category.color ?? "lavender",
  }));

  return (
    <main>
      <Hero categories={sceneCategories} />
      <Marquee />

      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <section id="trending">
          <h2 className="font-display text-4xl md:text-6xl">Trending now</h2>
          {home.result.trending.length === 0 ? (
            <p className="mt-6">No products yet. Run <code>npm run seed:demo</code> in the backend to add demo data.</p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7">
              {home.result.trending.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>

        {home.result.hiddenGems.length > 0 && (
          <section className="mt-28">
            <h2 className="font-display text-4xl md:text-6xl">Hidden <em>gems</em></h2>
            <p className="mt-2">Great products from small shops that deserve more eyes.</p>
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-7">
              {home.result.hiddenGems.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}