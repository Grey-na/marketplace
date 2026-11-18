import mongoose from "mongoose";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import CategoryModel from "../model/CategoryModel";
import InteractionModel from "../model/InteractionModel";
import { remember } from "../../utilities/cache";
import { type InteractionType } from "../../types/Interaction";

// ======================= settings: tune these and measure the effect =======================
export const WEIGHTS: Record<InteractionType, number> = { view: 1, click: 2, wishlist: 3, cart: 4, purchase: 5 };
export const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 5 * 60 * 1000;

const POPULARITY_WINDOW_DAYS = 30;       // only recent events count for "trending"
const POPULARITY_HALF_LIFE_DAYS = 7;     // an event loses half its value every 7 days
export const PROFILE_WINDOW_DAYS = 60;   // how far back we look to learn a customer's taste
const TASTE_HALF_LIFE_DAYS = 14;
export const MIN_EVENTS_FOR_PERSONALIZATION = 3;

const W_CONTENT = 0.7;                   // similar products: text similarity ...
const W_COLLAB = 0.3;                    // ... and "people also liked"
const W_CATEGORY = 0.15;                 // bonus for the same category
const W_PRICE = 0.05;                    // bonus for a similar price (half to double)
const MIN_CONTENT_SCORE = 0.08;
const W_POPULARITY_PRIOR = 0.15;         // a small push for generally popular products

export const SMALL_SHOP_FOLLOWERS = 25;  // a shop with this many followers or fewer counts as small
export const FRESH_EVERY = 5;            // every 5th slot goes to a "fresh find"
const NEW_PRODUCT_DAYS = 30;
const LOW_VIEWS = 5;

// ======================= types =======================
type Vector = Map<string, number>;

export type Stats = { views: number; wishlists: number; sold: number; ratingAvg: number; ratingCount: number };
export type CatalogItem = {
    id: string; shopId: string; categoryId: string; price: number; inStock: boolean;
    createdAt: Date; stats: Stats; vector: Vector;
};
export type Catalog = { items: Map<string, CatalogItem>; smallShops: Set<string> };
export type Entry = { id: string; reason: string };
export type Actor = { userId?: string; anonId?: string };
type EventLike = { product: mongoose.Types.ObjectId | string; type: string; createdAt: Date };

// ======================= text to vectors (TF-IDF) =======================
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "this", "that", "your", "you", "our", "are", "was",
    "has", "have", "not", "can", "all", "any", "new", "use", "made", "into", "per", "its", "also", "each", "very"]);

const tokenize = (text: string): string[] =>
    text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2 && !STOPWORDS.has(token));

const addTerms = (tf: Map<string, number>, text: string, weight: number) => {
    for(const token of tokenize(text)){
        tf.set(token, (tf.get(token) ?? 0) + weight)
    }
}

// scale a vector to length 1, so cosine similarity is just a dot product
const normalize = (vector: Vector) => {
    let sum = 0;
    vector.forEach((value) => { sum += value * value });
    const norm = Math.sqrt(sum) || 1;
    vector.forEach((value, term) => vector.set(term, value / norm))
}

const dot = (a: Vector, b: Vector): number => {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let sum = 0;
    small.forEach((value, term) => {
        const other = large.get(term);
        if(other !== undefined){
            sum += value * other;
        }
    })
    return sum;
}

// ======================= the catalog: every product visitors can see, with its vector =======================
const loadCatalog = async (): Promise<Catalog> => {
    const shops = await ShopModel.find({ status: "approved" }, { followerCount: 1 }).lean();
    const smallShops = new Set(
        shops.filter((shop) => (shop.followerCount ?? 0) <= SMALL_SHOP_FOLLOWERS).map((shop) => String(shop._id))
    );

    const categories = await CategoryModel.find({}, { title: 1 }).lean();
    const categoryTitle = new Map(categories.map((category) => [String(category._id), category.title]));

    const products = await ProductModel.find(
        { status: "active", isBlocked: false, shop: { $in: shops.map((shop) => shop._id) } },
        { title: 1, summary: 1, description: 1, highlights: 1, tags: 1, brand: 1, category: 1, shop: 1,
          afterDiscount: 1, stock: 1, stats: 1, createdAt: 1 },
        { limit: 3000 }
    ).lean();

    // term frequency per product. Words in the title and tags count more than words in the summary
    const frequencies = products.map((product) => {
        const tf = new Map<string, number>();
        addTerms(tf, product.title, 3);
        (product.tags ?? []).forEach((tag) => addTerms(tf, tag, 3));
        if(product.brand){
            addTerms(tf, product.brand, 2)
        }
        addTerms(tf, categoryTitle.get(String(product.category)) ?? "", 2);
        addTerms(tf, product.summary, 1);
        if(product.description){
            addTerms(tf, product.description, 1)
        }
        (product.highlights ?? []).forEach((line) => addTerms(tf, line, 1));
        return tf;
    });

    // document frequency: in how many products does each word appear? (rare words are more telling)
    const df = new Map<string, number>();
    frequencies.forEach((tf) => tf.forEach((_, term) => df.set(term, (df.get(term) ?? 0) + 1)));
    const total = products.length;

    const items = new Map<string, CatalogItem>();
    products.forEach((product, index) => {
        const vector: Vector = new Map();
        frequencies[index].forEach((count, term) => {
            const idf = Math.log((total + 1) / ((df.get(term) ?? 0) + 1)) + 1;
            vector.set(term, (1 + Math.log(count)) * idf)
        })
        normalize(vector)

        items.set(String(product._id), {
            id: String(product._id),
            shopId: String(product.shop),
            categoryId: String(product.category),
            price: product.afterDiscount,
            inStock: product.stock > 0,
            createdAt: new Date(product.createdAt),
            stats: {
                views: product.stats?.views ?? 0,
                wishlists: product.stats?.wishlists ?? 0,
                sold: product.stats?.sold ?? 0,
                ratingAvg: product.stats?.ratingAvg ?? 0,
                ratingCount: product.stats?.ratingCount ?? 0,
            },
            vector: vector,
        })
    })

    return { items: items, smallShops: smallShops };
}

export const getCatalog = () => remember("rec:catalog", CACHE_MS, loadCatalog);

// ======================= popularity with time decay =======================
// MongoDB expression: the weight of an event type
const weightExpression = {
    $switch: {
        branches: (Object.entries(WEIGHTS) as Array<[string, number]>).map(([type, weight]) => ({
            case: { $eq: ["$type", type] },
            then: weight,
        })),
        default: 0,
    },
};

const loadPopularity = async (): Promise<Map<string, number>> => {
    const now = new Date();
    const since = new Date(now.getTime() - POPULARITY_WINDOW_DAYS * DAY_MS);

    // decay = 0.5 ^ (age / half-life): a week-old event is worth half of a fresh one
    const decay = { $pow: [0.5, { $divide: [{ $subtract: [now, "$createdAt"] }, POPULARITY_HALF_LIFE_DAYS * DAY_MS] }] };

    const rows = await InteractionModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$product", score: { $sum: { $multiply: [weightExpression, decay] } } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.score as number]));
}

export const getPopularity = () => remember("rec:popularity", CACHE_MS, loadPopularity);

// ======================= small helpers =======================
const shuffle = <T>(list: T[]): T[] => {
    for(let i = list.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

const maxOf = (map: Map<string, number>) => Math.max(0.0001, ...map.values());

/**
 * @description Take the best items, but at most maxPerShop from one shop, so no shop fills the whole list
 */
export const pickDiverse = (ranked: Array<[string, number]>, limit: number, maxPerShop: number, catalog: Catalog): string[] => {
    const picked: string[] = [];
    const skipped: string[] = [];
    const perShop = new Map<string, number>();

    for(const [id] of ranked){
        if(picked.length >= limit){
            break;
        }
        const shopId = catalog.items.get(id)?.shopId ?? "";
        const used = perShop.get(shopId) ?? 0;
        if(used < maxPerShop){
            picked.push(id)
            perShop.set(shopId, used + 1)
        }else{
            skipped.push(id)
        }
    }
    // too few shops to fill the list: use the ones we skipped
    for(const id of skipped){
        if(picked.length >= limit){
            break;
        }
        picked.push(id)
    }
    return picked;
}

/**
 * @description Fair exposure: every FRESH_EVERY-th slot goes to a new or rarely seen product of a small shop
 */
export const injectFreshFinds = (entries: Entry[], catalog: Catalog, limit: number): Entry[] => {
    const result = entries.slice(0, limit);
    const taken = new Set(result.map((entry) => entry.id));
    const now = Date.now();

    const pool = shuffle([...catalog.items.values()].filter((item) =>
        item.inStock &&
        !taken.has(item.id) &&
        catalog.smallShops.has(item.shopId) &&
        ((now - item.createdAt.getTime()) / DAY_MS <= NEW_PRODUCT_DAYS || item.stats.views <= LOW_VIEWS)
    ));

    for(let slot = FRESH_EVERY - 1; slot < limit; slot += FRESH_EVERY){
        const found = pool.shift();
        if(!found){
            break;
        }
        const entry = { id: found.id, reason: "fresh_find" };
        if(slot < result.length){
            result[slot] = entry;
        }else{
            result.push(entry)
        }
    }
    return result;
}

// ======================= trending =======================
export const getTrending = async (limit: number): Promise<Entry[]> => {
    const catalog = await getCatalog();
    const popularity = await getPopularity();

    const ranked = [...catalog.items.values()]
        .filter((item) => item.inStock)
        .map((item) => [item.id, popularity.get(item.id) ?? 0] as [string, number])
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

    const ids = pickDiverse(ranked, limit, 3, catalog);
    const entries: Entry[] = ids.map((id) => ({ id: id, reason: "trending" }));

    // a young marketplace has few events: fill the rest with the newest products
    if(entries.length < limit){
        const have = new Set(ids);
        [...catalog.items.values()]
            .filter((item) => item.inStock && !have.has(item.id))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit - entries.length)
            .forEach((item) => entries.push({ id: item.id, reason: "new" }))
    }
    return entries;
}

// ======================= hidden gems =======================
export const getHiddenGems = async (limit: number): Promise<Entry[]> => {
    const catalog = await getCatalog();

    const ranked = [...catalog.items.values()]
        .filter((item) => item.inStock && catalog.smallShops.has(item.shopId))
        .map((item) => {
            const engagement = item.stats.wishlists + item.stats.sold * 2 + item.stats.views * 0.1;
            // good rating, or people clearly like it, even though the shop is small
            const qualifies = item.stats.ratingAvg >= 4 || engagement >= 2;
            const score = (item.stats.ratingAvg / 5) * 0.6 + Math.min(engagement / 10, 1) * 0.4;
            return [item.id, qualifies ? score : 0] as [string, number];
        })
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

    return pickDiverse(ranked, limit, 2, catalog).map((id) => ({ id: id, reason: "hidden_gem" }));
}

// ======================= similar products: content + "people also liked" =======================
const STRONG_TYPES: InteractionType[] = ["click", "wishlist", "cart", "purchase"];

/**
 * @description Products that people who showed strong interest in this product also interacted with
 */
const coOccurrence = (productId: string) => remember(`rec:co:${productId}`, CACHE_MS, async () => {
    const id = new mongoose.Types.ObjectId(productId);

    // 1. who showed interest in this product? (a logged in customer, or an anonymous visitor)
    const actors = await InteractionModel.aggregate([
        { $match: { product: id, type: { $in: STRONG_TYPES } } },
        { $group: { _id: { $ifNull: ["$user", "$anonId"] } } },
        { $limit: 500 },
    ]);
    if(actors.length === 0){
        return new Map<string, number>();
    }
    const userIds = actors.map((actor) => actor._id).filter((value) => value instanceof mongoose.Types.ObjectId);
    const anonIds = actors.map((actor) => actor._id).filter((value) => typeof value === "string");

    // 2. what else did those people interact with?
    const rows = await InteractionModel.aggregate([
        { $match: { $or: [{ user: { $in: userIds } }, { anonId: { $in: anonIds } }], product: { $ne: id } } },
        { $group: { _id: "$product", score: { $sum: weightExpression } } },
        { $sort: { score: -1 } },
        { $limit: 50 },
    ]);
    return new Map<string, number>(rows.map((row) => [String(row._id), row.score as number]));
});

export const getSimilarProducts = async (productId: string, limit: number): Promise<Entry[]> => {
    const catalog = await getCatalog();
    const target = catalog.items.get(productId);
    if(!target){
        return [];
    }
    const popularity = await getPopularity();

    // content part: how alike are the texts? plus a bonus for the same category and a similar price
    const content = new Map<string, number>();
    catalog.items.forEach((item) => {
        if(item.id === productId || !item.inStock){
            return;
        }
        let score = dot(target.vector, item.vector);
        if(item.categoryId === target.categoryId){
            score += W_CATEGORY;
        }
        const ratio = item.price / target.price;
        if(ratio >= 0.5 && ratio <= 2){
            score += W_PRICE;
        }
        if(score >= MIN_CONTENT_SCORE){
            content.set(item.id, score)
        }
    })

    // collaborative part: divided by popularity, so a blockbuster does not win everywhere
    const collab = new Map<string, number>();
    (await coOccurrence(productId)).forEach((score, id) => {
        if(catalog.items.get(id)?.inStock){
            collab.set(id, score / Math.sqrt(1 + (popularity.get(id) ?? 0)))
        }
    })

    // blend: both parts are scaled to 0..1 first
    const contentMax = maxOf(content);
    const collabMax = maxOf(collab);
    const ids = new Set([...content.keys(), ...collab.keys()]);
    const ranked = [...ids]
        .map((id) => [id, W_CONTENT * ((content.get(id) ?? 0) / contentMax) + W_COLLAB * ((collab.get(id) ?? 0) / collabMax)] as [string, number])
        .sort((a, b) => b[1] - a[1]);

    // at most 2 from one shop, so the list shows products from many shops
    return pickDiverse(ranked, limit, 2, catalog).map((id) => ({ id: id, reason: "similar" }));
}

// ======================= personalization: the taste vector =======================
export const loadEvents = async (actor: Actor, before: Date) => {
    const filter: Record<string, unknown> = {
        createdAt: { $gte: new Date(before.getTime() - PROFILE_WINDOW_DAYS * DAY_MS), $lt: before },
    };
    if(actor.userId){
        filter.user = actor.userId;
    }else{
        filter.anonId = actor.anonId;
    }
    return InteractionModel.find(filter, { product: 1, type: 1, createdAt: 1 }, { sort: { createdAt: -1 }, limit: 200 }).lean();
}

/**
 * @description What does this person like? The weighted sum of the vectors of the products they touched.
 * A purchase counts 5 times a view, and recent events count more than old ones
 */
export const buildTasteVector = (catalog: Catalog, events: EventLike[], now: Date) => {
    const taste: Vector = new Map();
    const purchased = new Set<string>();
    let used = 0;

    for(const event of events){
        const item = catalog.items.get(String(event.product));
        const weightOfType = WEIGHTS[event.type as InteractionType];
        if(!item || weightOfType === undefined){
            continue;
        }
        if(event.type === "purchase"){
            purchased.add(item.id)
        }
        const ageDays = (now.getTime() - new Date(event.createdAt).getTime()) / DAY_MS;
        const weight = weightOfType * Math.pow(0.5, ageDays / TASTE_HALF_LIFE_DAYS);

        item.vector.forEach((value, term) => taste.set(term, (taste.get(term) ?? 0) + value * weight))
        used++;
    }
    normalize(taste)
    return { taste: taste, purchased: purchased, used: used };
}

/**
 * @description Score every product against the taste vector
 */
export const rankByTaste = (catalog: Catalog, popularity: Map<string, number>, taste: Vector, excluded: Set<string>): Array<[string, number]> => {
    const maxPopularity = maxOf(popularity);
    const ranked: Array<[string, number]> = [];

    catalog.items.forEach((item) => {
        if(!item.inStock || excluded.has(item.id)){
            return;
        }
        const similarity = dot(taste, item.vector);
        if(similarity <= 0){
            return;
        }
        ranked.push([item.id, similarity + W_POPULARITY_PRIOR * ((popularity.get(item.id) ?? 0) / maxPopularity)])
    })
    return ranked.sort((a, b) => b[1] - a[1]);
}

export const getPersonalized = async (actor: Actor | null, limit: number): Promise<{ entries: Entry[]; personalized: boolean }> => {
    const catalog = await getCatalog();
    const popularity = await getPopularity();

    if(actor){
        const now = new Date();
        const events = await loadEvents(actor, now);
        const { taste, purchased, used } = buildTasteVector(catalog, events, now);

        if(used >= MIN_EVENTS_FOR_PERSONALIZATION){
            const ranked = rankByTaste(catalog, popularity, taste, purchased);
            const entries = pickDiverse(ranked, limit, 3, catalog).map((id) => ({ id: id, reason: "for_you" }));
            return { entries: injectFreshFinds(entries, catalog, limit), personalized: true };
        }
    }

    // cold start: a new customer, or a visitor we know nothing about
    const trending = await getTrending(limit);
    return { entries: injectFreshFinds(trending, catalog, limit), personalized: false };
}

// ======================= from ids to product cards =======================
export const hydrate = async (entries: Entry[]) => {
    if(entries.length === 0){
        return [];
    }
    // checked again against the database: the cache can be a few minutes old
    const rows = await ProductModel.find(
        { _id: { $in: entries.map((entry) => entry.id) }, status: "active", isBlocked: false },
        { createdBy: 0, updatedBy: 0, isBlocked: 0, blockReason: 0, __v: 0 }
    )
        .populate("category", "_id title slug color")
        .populate("shop", "_id name slug logo isVerified")
        .lean();

    const byId = new Map(rows.map((row) => [String(row._id), row]));
    return entries.flatMap((entry) => {
        const row = byId.get(entry.id);
        return row ? [{ ...row, reason: entry.reason }] : [];
    });
}