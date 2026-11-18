import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import slugify from "slugify";
import { connectDB } from "../config/Database";
import UserModel from "../app/model/UserModel";
import ShopModel from "../app/model/ShopModel";
import CategoryModel from "../app/model/CategoryModel";
import ProductModel from "../app/model/ProductModel";
import InteractionModel from "../app/model/InteractionModel";
import { type InteractionType } from "../types/Interaction";
import { type CategoryColor } from "../types/Category";

const DEMO_EMAIL = /@demo\.local$/;
const DEMO_PASSWORD = "Demo@1234";
const DAY_MS = 24 * 60 * 60 * 1000;

// the same "random" numbers on every run, so the demo is repeatable
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const random = mulberry32(42);
const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
const round1 = (value: number) => Math.round(value * 10) / 10;

const CATEGORIES: Array<{ title: string; color: CategoryColor }> = [
    { title: "Streetwear", color: "lavender" },
    { title: "Home & Living", color: "mint" },
    { title: "Beauty", color: "pink" },
    { title: "Accessories", color: "butter" },
];

type ProductSpec = [title: string, tags: string[], priceRs: number];
type ShopSpec = { name: string; cluster: number; category: string; followers: number; verified: boolean; products: ProductSpec[] };

// cluster 0 = streetwear fans, 1 = home fans, 2 = beauty and accessories fans
const SHOPS: ShopSpec[] = [
    { name: "Kicks & Co Demo", cluster: 0, category: "Streetwear", followers: 120, verified: true, products: [
        ["Retro Runner Sneakers", ["sneakers", "shoes", "retro", "streetwear"], 5499],
        ["Oversized Graphite Hoodie", ["hoodie", "oversized", "streetwear", "black"], 3299],
        ["Cargo Jogger Pants", ["cargo", "pants", "streetwear", "utility"], 2799],
        ["Dad Cap Washed Black", ["cap", "hat", "streetwear", "black"], 899],
    ]},
    { name: "Thread Theory Demo", cluster: 0, category: "Streetwear", followers: 40, verified: false, products: [
        ["Boxy Graphic Tee", ["tshirt", "graphic", "boxy", "streetwear"], 1499],
        ["Oversized Black Sweatshirt", ["sweatshirt", "oversized", "black", "streetwear"], 2999],
        ["Windbreaker Jacket Teal", ["jacket", "windbreaker", "streetwear", "teal"], 3999],
        ["Canvas High Tops", ["sneakers", "canvas", "shoes", "streetwear"], 3599],
    ]},
    { name: "Nest & Bloom Demo", cluster: 1, category: "Home & Living", followers: 15, verified: false, products: [
        ["Boho Cushion Cover Set", ["cushion", "boho", "decor", "living-room"], 1299],
        ["Macrame Wall Hanging", ["macrame", "wall", "decor", "boho"], 1899],
        ["Scented Soy Candle Trio", ["candle", "soy", "scented", "decor"], 1599],
        ["Woven Storage Basket", ["basket", "woven", "storage", "decor"], 1399],
    ]},
    { name: "Clay Studio Demo", cluster: 1, category: "Home & Living", followers: 8, verified: false, products: [
        ["Hand-thrown Ceramic Mug", ["ceramic", "mug", "handmade", "kitchen"], 999],
        ["Terracotta Planter Pot", ["planter", "terracotta", "plants", "decor"], 1199],
        ["Stoneware Dinner Bowl Set", ["bowl", "stoneware", "handmade", "kitchen"], 2499],
        ["Ceramic Vase Matte White", ["vase", "ceramic", "decor", "minimal"], 1799],
    ]},
    { name: "Glow Garden Demo", cluster: 2, category: "Beauty", followers: 60, verified: true, products: [
        ["Rose Water Face Mist", ["skincare", "rose", "mist", "facial"], 799],
        ["Vitamin C Glow Serum", ["skincare", "serum", "vitamin", "facial"], 1799],
        ["Aloe Hydrating Gel", ["skincare", "aloe", "gel", "hydrating"], 699],
        ["Natural Lip Balm Duo", ["lip", "balm", "natural", "skincare"], 499],
    ]},
    { name: "Bead & Brass Demo", cluster: 2, category: "Accessories", followers: 5, verified: false, products: [
        ["Beaded Choker Necklace", ["necklace", "beaded", "jewelry", "handmade"], 1099],
        ["Brass Hoop Earrings", ["earrings", "brass", "jewelry", "handmade"], 1299],
        ["Handwoven Tote Bag", ["tote", "bag", "handwoven", "accessories"], 1999],
        ["Silver Tone Cuff Bracelet", ["bracelet", "cuff", "jewelry", "minimal"], 1499],
    ]},
];

// how a customer's actions are spread: many views, few purchases
const rollType = (): InteractionType => {
    const roll = random();
    if(roll < 0.55) return "view";
    if(roll < 0.75) return "click";
    if(roll < 0.87) return "wishlist";
    if(roll < 0.95) return "cart";
    return "purchase";
}

const resetDemoData = async () => {
    const users = await UserModel.find({ username: DEMO_EMAIL }, { _id: 1 }).lean();
    const userIds = users.map((user) => user._id);
    const shops = await ShopModel.find({ owner: { $in: userIds } }, { _id: 1 }).lean();
    const shopIds = shops.map((shop) => shop._id);
    const products = await ProductModel.find({ shop: { $in: shopIds } }, { _id: 1 }).lean();
    const productIds = products.map((product) => product._id);

    await InteractionModel.deleteMany({ $or: [{ user: { $in: userIds } }, { product: { $in: productIds } }] });
    await ProductModel.deleteMany({ _id: { $in: productIds } });
    await ShopModel.deleteMany({ _id: { $in: shopIds } });
    await UserModel.deleteMany({ _id: { $in: userIds } });
    console.log("Old demo data removed")
}

const run = async () => {
    await connectDB();

    const exists = await UserModel.exists({ username: DEMO_EMAIL });
    if(exists && !process.argv.includes("--reset")){
        console.log("Demo data already exists. To rebuild it run: npm run seed:demo -- --reset")
        await mongoose.disconnect();
        return;
    }
    if(exists){
        await resetDemoData()
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // categories: use yours if the slug exists, create them if not
    const categoryBySlug = new Map<string, mongoose.Types.ObjectId>();
    for(const spec of CATEGORIES){
        const slug = slugify(spec.title, { lower: true, strict: true });
        let category = await CategoryModel.findOne({ slug: slug });
        if(!category){
            category = await CategoryModel.create({ title: spec.title, slug: slug, status: "active", color: spec.color });
        }
        categoryBySlug.set(spec.title, category._id);
    }

    // sellers, shops and products
    const clusterProducts: Record<number, mongoose.Types.ObjectId[]> = { 0: [], 1: [], 2: [] };
    const allProducts: mongoose.Types.ObjectId[] = [];
    const shopOfProduct = new Map<string, mongoose.Types.ObjectId>();
    const shopOfProductIndex = new Map<string, number>();

    const shopDocs: Array<{ id: mongoose.Types.ObjectId; productIds: mongoose.Types.ObjectId[] }> = [];

    for(const [index, spec] of SHOPS.entries()){
        const seller = await UserModel.create({
            fullName: `Demo Seller ${index + 1}`, username: `demo-seller-${index + 1}@demo.local`,
            password: passwordHash, role: "seller", phone: "9800000000",
        });
        const shopSlug = slugify(spec.name, { lower: true, strict: true });
        const shop = await ShopModel.create({
            owner: seller._id, name: spec.name, slug: shopSlug,
            description: `Demo shop: ${spec.name}`,
            logo: { url: `https://picsum.photos/seed/${shopSlug}-logo/200/200` },
            cover: { url: `https://picsum.photos/seed/${shopSlug}-cover/900/300` },
            contact: { phone: "9800000000" },
            status: "approved", approvedAt: new Date(), isVerified: spec.verified, followerCount: spec.followers,
        });

        const productIds: mongoose.Types.ObjectId[] = [];
        for(const [title, tags, priceRs] of spec.products){
            const productSlug = `${slugify(title, { lower: true, strict: true })}-${crypto.randomBytes(4).toString("hex")}`;
            const product = await ProductModel.create({
                shop: shop._id,
                category: categoryBySlug.get(spec.category),
                title: title,
                slug: productSlug,
                summary: `A handpicked ${title.toLowerCase()} from ${spec.name}, made with care for everyday use.`,
                price: priceRs * 100,
                discount: pick([0, 0, 10, 15, 20]),
                stock: 50,
                brand: spec.name,
                tags: tags,
                images: [{ url: `https://picsum.photos/seed/${productSlug}/600/750` }],
                status: "active",
                createdBy: seller._id,
                // products appear over the last 40 days, so some count as "new"
                createdAt: new Date(Date.now() - Math.floor(random() * 40) * DAY_MS),
            });
            productIds.push(product._id);
            clusterProducts[spec.cluster].push(product._id);
            allProducts.push(product._id);
            shopOfProduct.set(String(product._id), shop._id);
            shopOfProductIndex.set(String(product._id), index);
        }
        shopDocs.push({ id: shop._id, productIds: productIds });
    }

    // customers and their behaviour: 80% of what they touch belongs to their own taste group
    const interactions: Array<Record<string, unknown>> = [];
    const views = new Map<string, number>();
    const wishlists = new Map<string, number>();
    const sold = new Map<string, number>();

    for(let i = 0; i < 30; i++){
        const customer = await UserModel.create({
            fullName: `Demo Customer ${i + 1}`, username: `demo-customer-${i + 1}@demo.local`,
            password: passwordHash, role: "customer", phone: "9800000001",
        });
        const cluster = Math.floor(i / 10);          // customers 1-10, 11-20 and 21-30
        const eventCount = 30 + Math.floor(random() * 15);

        for(let e = 0; e < eventCount; e++){
            const productId = random() < 0.8 ? pick(clusterProducts[cluster]) : pick(allProducts);
            const type = rollType();
            interactions.push({
                user: customer._id,
                product: productId,
                shop: shopOfProduct.get(String(productId)),
                type: type,
                createdAt: new Date(Date.now() - random() * 30 * DAY_MS),
            });
            const key = String(productId);
            if(type === "view") views.set(key, (views.get(key) ?? 0) + 1);
            if(type === "wishlist") wishlists.set(key, (wishlists.get(key) ?? 0) + 1);
            if(type === "purchase") sold.set(key, (sold.get(key) ?? 0) + 1);
        }
    }
    await InteractionModel.insertMany(interactions);

    // counters on products and shops. They are set directly here, because demo purchases have no real orders
    for(const shop of shopDocs){
        let ratingSum = 0;
        let ratingProducts = 0;
        for(const productId of shop.productIds){
            const key = String(productId);
            const purchases = sold.get(key) ?? 0;
            const ratingCount = Math.min(purchases, 4);
            const ratingAvg = ratingCount > 0 ? round1(3.8 + random() * 1.1) : 0;
            if(ratingCount > 0){
                ratingSum += ratingAvg;
                ratingProducts++;
            }
            await ProductModel.updateOne({ _id: productId }, { $set: {
                "stats.views": views.get(key) ?? 0,
                "stats.wishlists": wishlists.get(key) ?? 0,
                "stats.sold": purchases,
                "stats.ratingAvg": ratingAvg,
                "stats.ratingCount": ratingCount,
            }});
        }
        await ShopModel.updateOne({ _id: shop.id }, { $set: {
            ratingAvg: ratingProducts > 0 ? round1(ratingSum / ratingProducts) : 0,
            ratingCount: ratingProducts,
        }});
    }

    console.log(`Done: ${SHOPS.length} shops, ${allProducts.length} products, 30 customers, ${interactions.length} events`)
    console.log(`Logins: demo-customer-1..30@demo.local and demo-seller-1..6@demo.local, password ${DEMO_PASSWORD}`)
    console.log("Customers 1-10 like streetwear, 11-20 like home and living, 21-30 like beauty and accessories")
    await mongoose.disconnect();
}

run().catch((error) => {
    console.error(error)
    process.exit(1)
})