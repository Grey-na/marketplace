import { type Request, type Response, type NextFunction } from "express";
import ShopModel from "../model/ShopModel";
import ProductModel from "../model/ProductModel";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import PaymentModel from "../model/PaymentModel";
import UserModel from "../model/UserModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEZONE = "Asia/Kathmandu";     // a day starts and ends at midnight in Nepal
const CHART_DAYS = 14;
const LOW_STOCK = 5;

// the last N days as "2026-11-24", oldest first
const lastDays = (count: number): string[] => {
    const days: string[] = [];
    for(let i = count - 1; i >= 0; i--){
        days.push(new Date(Date.now() - i * DAY_MS).toLocaleDateString("en-CA", { timeZone: TIMEZONE }));
    }
    return days;
}

// days without any order are missing from the database result: put them back as zeros
const fillDaily = (days: string[], rows: Array<{ _id: string; orders: number; revenue: number }>) => {
    const byDay = new Map(rows.map((row) => [row._id, row]));
    return days.map((day) => ({
        date: day,
        orders: byDay.get(day)?.orders ?? 0,
        revenue: byDay.get(day)?.revenue ?? 0,
    }));
}

// turns [{ _id: "pending", count: 3 }, ...] into { pending: 3, ... } with zeros for missing keys
const toCounts = (keys: string[], rows: Array<{ _id: string; count: number }>) => {
    const result: Record<string, number> = {};
    keys.forEach((key) => { result[key] = 0 });
    rows.forEach((row) => { result[row._id] = row.count });
    return result;
}

// one "day" bucket expression, cut at midnight in Nepal
const dayOf = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } };

export default class DashboardController{
    /**
     * @description Seller: the numbers for my dashboard
     */
    async getSellerStats(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findOne(
                { owner: user._id },
                { name: 1, slug: 1, status: 1, followerCount: 1, ratingAvg: 1, ratingCount: 1 }
            ).lean();
            if(!shop){
                throw new ApiError("Create your shop first", 403)
            }

            const days = lastDays(CHART_DAYS);
            const since = new Date(Date.now() - CHART_DAYS * DAY_MS);

            const [parcelFacets, productTotal, productActive, lowStock] = await Promise.all([
                // three questions about the parcels of this shop, asked in one query
                ShopOrderModel.aggregate([
                    { $match: { shop: shop._id, status: { $ne: "awaiting_payment" } } },
                    { $facet: {
                        byStatus: [
                            { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$subtotal" } } },
                        ],
                        daily: [
                            { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: since } } },
                            { $group: { _id: dayOf, orders: { $sum: 1 }, revenue: { $sum: "$subtotal" } } },
                        ],
                        top: [
                            { $match: { status: { $ne: "cancelled" } } },
                            { $unwind: "$items" },
                            { $group: {
                                _id: "$items.product",
                                title: { $first: "$items.title" },
                                slug: { $first: "$items.slug" },
                                image: { $first: "$items.image" },
                                units: { $sum: "$items.quantity" },
                                revenue: { $sum: "$items.lineTotal" },
                            } },
                            { $sort: { units: -1 } },
                            { $limit: 5 },
                        ],
                    } },
                ]),
                ProductModel.countDocuments({ shop: shop._id }),
                ProductModel.countDocuments({ shop: shop._id, status: "active" }),
                ProductModel.find(
                    { shop: shop._id, status: "active", stock: { $lte: LOW_STOCK } },
                    { title: 1, slug: 1, stock: 1 },
                    { sort: { stock: 1 }, limit: 5 }
                ).lean(),
            ]);

            const facet = parcelFacets[0] ?? { byStatus: [], daily: [], top: [] };
            const statuses = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
            const orders = toCounts(statuses, facet.byStatus);

            const value = (status: string): number =>
                facet.byStatus.find((row: { _id: string; value: number }) => row._id === status)?.value ?? 0;

            res.json({
                result: {
                    shop: shop,
                    products: { total: productTotal, active: productActive, lowStock: lowStock },
                    orders: orders,
                    // the item value of delivered parcels is earned, the rest is still on its way
                    sales: {
                        earned: value("delivered"),
                        inProgress: value("pending") + value("confirmed") + value("packed") + value("shipped"),
                    },
                    daily: fillDaily(days, facet.daily),
                    topProducts: facet.top.map((row: Record<string, unknown>) => ({
                        productId: row._id,
                        title: row.title,
                        slug: row.slug,
                        image: row.image,
                        units: row.units,
                        revenue: row.revenue,
                    })),
                },
                message: "Seller Stats",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: the numbers for the admin dashboard
     */
    async getAdminStats(_: Request, res: Response, next: NextFunction){
        try{
            const days = lastDays(CHART_DAYS);
            const since = new Date(Date.now() - CHART_DAYS * DAY_MS);

            const [
                userRows, shopRows, productTotal, productActive, productBlocked,
                orderTotal, orderRows, parcelFacets, refundsPending, paymentsToRefund, shopsToReview,
            ] = await Promise.all([
                UserModel.aggregate([{ $group: { _id: { role: "$role", status: "$status" }, count: { $sum: 1 } } }]),
                ShopModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
                ProductModel.countDocuments({}),
                ProductModel.countDocuments({ status: "active", isBlocked: false }),
                ProductModel.countDocuments({ isBlocked: true }),
                OrderModel.countDocuments({}),
                OrderModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
                ShopOrderModel.aggregate([
                    { $match: { status: { $nin: ["awaiting_payment", "cancelled"] } } },
                    { $facet: {
                        all: [{ $group: { _id: null, parcels: { $sum: 1 }, gmv: { $sum: "$total" } } }],
                        delivered: [{ $match: { status: "delivered" } }, { $group: { _id: null, gmv: { $sum: "$total" } } }],
                        daily: [
                            { $match: { createdAt: { $gte: since } } },
                            { $group: { _id: dayOf, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
                        ],
                    } },
                ]),
                ShopOrderModel.countDocuments({ "refund.status": "pending" }),
                PaymentModel.countDocuments({ status: "refund_needed" }),
                // the oldest waiting shops first: they have waited the longest
                ShopModel.find({ status: "pending" }, { name: 1, slug: 1, createdAt: 1 }, { sort: { createdAt: 1 }, limit: 5 }).lean(),
            ]);

            // users: by role, and how many are suspended
            const users = { total: 0, customers: 0, sellers: 0, admins: 0, suspended: 0 };
            userRows.forEach((row: { _id: { role: string; status: string }; count: number }) => {
                users.total += row.count;
                if(row._id.role === "customer") users.customers += row.count;
                if(row._id.role === "seller") users.sellers += row.count;
                if(row._id.role === "admin") users.admins += row.count;
                if(row._id.status === "suspended") users.suspended += row.count;
            });

            const shops = toCounts(["pending", "approved", "rejected", "suspended"], shopRows);
            const facet = parcelFacets[0] ?? { all: [], delivered: [], daily: [] };

            res.json({
                result: {
                    users: users,
                    shops: shops,
                    products: { total: productTotal, active: productActive, blocked: productBlocked },
                    orders: {
                        total: orderTotal,
                        byStatus: toCounts(["awaiting_payment", "placed", "processing", "completed", "cancelled"], orderRows),
                    },
                    // the money that passes through the marketplace (parcel totals, cancelled and unpaid excluded)
                    sales: {
                        parcels: facet.all[0]?.parcels ?? 0,
                        gmv: facet.all[0]?.gmv ?? 0,
                        delivered: facet.delivered[0]?.gmv ?? 0,
                    },
                    daily: fillDaily(days, facet.daily),
                    attention: {
                        shopsToReview: shopsToReview,
                        pendingShops: shops.pending,
                        refundsPending: refundsPending,
                        paymentsToRefund: paymentsToRefund,
                    },
                },
                message: "Admin Stats",
            })
        }catch(exception){
            next(exception)
        }
    }
}