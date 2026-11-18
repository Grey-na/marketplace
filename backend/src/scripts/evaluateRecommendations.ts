import mongoose from "mongoose";
import { connectDB } from "../config/Database";
import InteractionModel from "../app/model/InteractionModel";
import {
    buildTasteVector, DAY_MS, getCatalog, getPopularity, injectFreshFinds, MIN_EVENTS_FOR_PERSONALIZATION,
    pickDiverse, PROFILE_WINDOW_DAYS, rankByTaste, type Catalog,
} from "../app/services/RecommendationService";

const K = 10;
const POSITIVE = ["wishlist", "cart", "purchase"];

type Totals = { users: number; hits: number; slots: number; smallSlots: number; shown: Set<string> };
const newTotals = (): Totals => ({ users: 0, hits: 0, slots: 0, smallSlots: 0, shown: new Set() });

const record = (totals: Totals, ids: string[], targetId: string, catalog: Catalog) => {
    totals.users++;
    if(ids.includes(targetId)){
        totals.hits++;
    }
    ids.forEach((id) => {
        totals.shown.add(id);
        totals.slots++;
        if(catalog.smallShops.has(catalog.items.get(id)?.shopId ?? "")){
            totals.smallSlots++;
        }
    })
}

const run = async () => {
    await connectDB();
    const catalog = await getCatalog();
    const popularity = await getPopularity();

    const events = await InteractionModel.find(
        { user: { $ne: null } },
        { user: 1, product: 1, type: 1, createdAt: 1 },
        { sort: { createdAt: 1 } }
    ).lean();

    const byUser = new Map<string, typeof events>();
    events.forEach((event) => {
        const key = String(event.user);
        const list = byUser.get(key) ?? [];
        list.push(event);
        byUser.set(key, list);
    })

    const baseline = newTotals();
    const personal = newTotals();
    const personalFresh = newTotals();

    for(const list of byUser.values()){
        const positives = list.filter((event) => POSITIVE.includes(event.type) && catalog.items.has(String(event.product)));
        if(positives.length < 3){
            continue;
        }

        // hide the most recent strong action
        const target = positives[positives.length - 1];
        const targetId = String(target.product);
        const before = new Date(target.createdAt);
        const windowStart = before.getTime() - PROFILE_WINDOW_DAYS * DAY_MS;

        // the taste is built only from what happened BEFORE, and never from the hidden product
        const train = list
            .filter((event) => {
                const time = new Date(event.createdAt).getTime();
                return time < before.getTime() && time >= windowStart && String(event.product) !== targetId;
            })
            .reverse()
            .slice(0, 200);

        const { taste, purchased, used } = buildTasteVector(catalog, train, before);
        if(used < MIN_EVENTS_FOR_PERSONALIZATION){
            continue;
        }

        // method 1: the baseline, "most popular"
        const popularIds = [...catalog.items.values()]
            .filter((item) => item.inStock && !purchased.has(item.id))
            .sort((a, b) => (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0))
            .slice(0, K)
            .map((item) => item.id);

        // method 2: personalized
        const ranked = rankByTaste(catalog, popularity, taste, purchased);
        const personalIds = pickDiverse(ranked, K, 3, catalog);

        // method 3: personalized, with the fair-exposure slots
        const freshIds = injectFreshFinds(personalIds.map((id) => ({ id: id, reason: "for_you" })), catalog, K).map((entry) => entry.id);

        record(baseline, popularIds, targetId, catalog);
        record(personal, personalIds, targetId, catalog);
        record(personalFresh, freshIds, targetId, catalog);
    }

    const row = (name: string, totals: Totals) => ({
        method: name,
        users: totals.users,
        [`hit rate@${K}`]: totals.users ? (totals.hits / totals.users).toFixed(3) : "n/a",
        [`precision@${K}`]: totals.users ? (totals.hits / (totals.users * K)).toFixed(3) : "n/a",
        coverage: (totals.shown.size / Math.max(1, catalog.items.size)).toFixed(3),
        "small-shop share": totals.slots ? (totals.smallSlots / totals.slots).toFixed(3) : "n/a",
    });

    console.table([
        row("popularity baseline", baseline),
        row("personalized", personal),
        row("personalized + fresh finds", personalFresh),
    ])
    console.log("hit rate = how often the hidden product was in the top list.")
    console.log("coverage = the share of the catalog that was recommended to anyone.")
    console.log("small-shop share = the share of recommendation slots given to small shops.")
    await mongoose.disconnect();
}

run().catch((error) => {
    console.error(error)
    process.exit(1)
})