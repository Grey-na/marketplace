import Band from "@/components/home/Band";
import CategoryIslands from "@/components/home/CategoryIslands";
import ForYouSection from "@/components/home/ForYouSection";
import Hero from "@/components/home/Hero";
import SectionHeading from "@/components/home/SectionHeading";
import ProductCard from "@/components/ui/product/ProductCard";
import ShopCard from "@/components/shop/ShopCard";
import Marquee from "@/components/ui/Marquee";
import Reveal from "@/components/ui/Reveal";
import { apiGet } from "@/lib/api";
import type { CategoryLite, ProductCardData, ShopCardData } from "@/types/api";

type HomeData = {
  trending: ProductCardData[];
  hiddenGems: ProductCardData[];
};

export default async function HomePage() {
  const [home, categories, fresh, featured] = await Promise.all([
    apiGet<HomeData>("/recommendations/home?limit=6"),
    apiGet<CategoryLite[]>("/categories/home?limit=8", { revalidate: 60 }),
    apiGet<ProductCardData[]>("/products?sort=newest&limit=5"),
    apiGet<ShopCardData[]>("/shops?featured=true&limit=8", { revalidate: 60 }),
  ]);

  // no shop is featured yet? show the most followed ones instead
  let shops = featured.result;
  if (shops.length === 0) {
    shops = (await apiGet<ShopCardData[]>("/shops?sort=popular&limit=8", { revalidate: 60 })).result;
  }

  const sceneCategories = categories.result.slice(0, 4).map((category) => ({
    slug: category.slug,
    title: category.title,
    color: category.color ?? "lavender",
  }));

  return (
    <main className="overflow-x-clip">
      <Hero categories={sceneCategories} />
      <Marquee />

      {/* 1. categories */}
      <section className="mx-auto max-w-7xl px-6 pb-28 pt-24 md:px-10">
        <Reveal>
          <SectionHeading
            eyebrow="Browse"
            title={<>Pick a <em>world</em></>}
            text="Every category is a little universe of small shops."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <CategoryIslands categories={categories.result} />
        </Reveal>
      </section>

      {/* 2. for you (personal, loaded in the browser) */}
      <Band className="bg-pink">
        <ForYouSection />
      </Band>

      {/* 3. fresh drops */}
      {fresh.result.length > 0 && (
        <Band className="bg-mint">
          <Reveal>
            <SectionHeading
              eyebrow="Just landed"
              title={<>Fresh <em>drops</em></>}
              text="The newest things from the shops."
              href="/products?sort=newest"
              linkLabel="All new arrivals"
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-5 md:gap-6">
            {fresh.result.map((product, index) => (
              <Reveal key={product._id} delay={index * 0.07} className={index % 2 === 1 ? "md:mt-12" : ""}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </Band>
      )}

      {/* 4. trending */}
      <Band id="trending" className="bg-cream bg-dots">
        <Reveal>
          <SectionHeading
            eyebrow="Everyone is looking"
            title={<>Trending <em>now</em></>}
            href="/products?sort=popular"
            linkLabel="See what is popular"
          />
        </Reveal>
        {home.result.trending.length === 0 ? (
          <p>No products yet. Run <code>npm run seed:demo</code> in the backend to add demo data.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 md:gap-x-8">
            {home.result.trending.map((product, index) => (
              <Reveal key={product._id} delay={(index % 3) * 0.08} className="relative">
                {/* big outlined number on the corner of the card */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-1 -top-9 z-10 font-display text-8xl leading-none text-transparent [-webkit-text-stroke:2px_var(--charcoal)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </Band>

      {/* 5. hidden gems */}
      {home.result.hiddenGems.length > 0 && (
        <Band className="bg-charcoal text-cream">
          <Reveal>
            <SectionHeading
              eyebrow="Small shops"
              title={<>Hidden <em>gems</em></>}
              text="Great products from small shops that deserve more eyes."
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-7">
            {home.result.hiddenGems.map((product, index) => (
              <Reveal key={product._id} delay={(index % 3) * 0.08}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </Band>
      )}

      {/* 6. shops */}
      {shops.length > 0 && (
        <Band className="bg-lavender">
          <Reveal>
            <SectionHeading
              eyebrow="Meet the makers"
              title={<>Featured <em>shops</em></>}
              href="/shops"
              linkLabel="All shops"
            />
          </Reveal>
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6 pt-2 md:-mx-10 md:px-10">
            {shops.map((shop) => (
              <ShopCard key={shop._id} shop={shop} />
            ))}
          </div>
        </Band>
      )}
    </main>
  );
}