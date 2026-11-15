import crypto from "crypto";
import mongoose from "mongoose";
import CartModel from "../model/CartModel";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ApiError from "../errors/ApiError";
import { type CheckoutInput } from "../request/OrderRequest";
import { DELIVERY_CHARGE_PAISA } from "../../types/Order";
import { isBuyable } from "../../utilities/catalog";
import { logInteraction } from "../services/InteractionService";

const makeOrderNo = () => {
    const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `ORD-${day}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

type Reserved = { productId: mongoose.Types.ObjectId; quantity: number };

// give reserved stock back (if one of the updates fails, the others still run)
const releaseStock = async (reserved: Reserved[]) => {
    await Promise.allSettled(reserved.map((item) =>
        ProductModel.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity, "stats.sold": -item.quantity } }
        )
    ));
}

/**
 * @description Turn the customer's cart into one Order and one ShopOrder per shop
 *
 * 1. Read the cart and check every item against the LIVE product (price, stock, visibility)
 * 2. Reserve the stock with an atomic update per product ("subtract only if enough is left")
 * 3. Create the Order and its ShopOrders (with snapshots of the items)
 * 4. Clear the cart
 * If anything fails after step 2, the stock is given back and what was created is deleted.
 * (A MongoDB transaction would do this more strictly, but it needs a replica set.)
 */
export const placeOrder = async (userId: string, input: CheckoutInput) => {
    // ---------- 1. check the cart ----------
    const cart = await CartModel.findOne({ user: userId }).lean();
    if(!cart || cart.items.length === 0){
        throw new ApiError("Validation Failed", 400, { cart: "Your cart is empty" })
    }

    const products = await ProductModel.find({ _id: { $in: cart.items.map((item) => item.product) } }).lean();
    const shops = await ShopModel.find({ _id: { $in: products.map((product) => product.shop) } }, { name: 1, status: 1 }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const shopMap = new Map(shops.map((shop) => [String(shop._id), shop]));

    // collect ALL problems, so the customer can fix everything at once
    const problems: Record<string, string> = {};
    const lines: Array<{ product: (typeof products)[number]; quantity: number }> = [];

    for(const item of cart.items){
        const product = productMap.get(String(item.product));
        if(!product || !isBuyable(product, shopMap.get(String(product.shop)))){
            problems[String(item.product)] = "This product is no longer available";
        }else if(product.stock < item.quantity){
            problems[String(item.product)] = `${product.title}: only ${product.stock} left`;
        }else{
            lines.push({ product: product, quantity: item.quantity })
        }
    }
    if(Object.keys(problems).length > 0){
        throw new ApiError("Some items in your cart cannot be ordered", 409, problems)
    }

    // ---------- 2 to 4 ----------
    const reserved: Reserved[] = [];
    let createdOrderId: mongoose.Types.ObjectId | null = null;

    try{
        // 2. reserve the stock. The condition stock >= quantity makes overselling impossible
        for(const line of lines){
            const result = await ProductModel.updateOne(
                { _id: line.product._id, stock: { $gte: line.quantity }, status: "active", isBlocked: false },
                { $inc: { stock: -line.quantity, "stats.sold": line.quantity } }
            );
            if(result.modifiedCount !== 1){
                // someone bought it a moment ago
                throw new ApiError("Some items in your cart cannot be ordered", 409, {
                    [String(line.product._id)]: `${line.product.title}: not enough stock left`,
                })
            }
            reserved.push({ productId: line.product._id, quantity: line.quantity })
        }

        // 3. one ShopOrder for each shop
        const byShop = new Map<string, typeof lines>();
        for(const line of lines){
            const key = String(line.product.shop);
            byShop.set(key, [...(byShop.get(key) ?? []), line]);
        }

        const shopOrdersData = [...byShop.entries()].map(([shopId, shopLines]) => {
            const items = shopLines.map(({ product, quantity }) => ({
                product: product._id,
                title: product.title,
                slug: product.slug,
                image: product.images?.[0]?.url ?? null,
                unitPrice: product.afterDiscount,
                originalPrice: product.price,
                discount: product.discount,
                quantity: quantity,
                lineTotal: product.afterDiscount * quantity,
            }));
            const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
            return {
                shop: new mongoose.Types.ObjectId(shopId),
                items: items,
                subtotal: subtotal,
                deliveryCharge: DELIVERY_CHARGE_PAISA,
                total: subtotal + DELIVERY_CHARGE_PAISA,
            };
        });

        const subtotal = shopOrdersData.reduce((sum, shopOrder) => sum + shopOrder.subtotal, 0);
        const deliveryCharge = shopOrdersData.length * DELIVERY_CHARGE_PAISA;

        const order = await OrderModel.create({
            orderNo: makeOrderNo(),
            user: new mongoose.Types.ObjectId(userId),
            address: input.address,
            note: input.note ?? null,
            subtotal: subtotal,
            deliveryCharge: deliveryCharge,
            total: subtotal + deliveryCharge,
            payment: { method: input.paymentMethod, status: "pending" },
        });
        createdOrderId = order._id;

        await ShopOrderModel.insertMany(shopOrdersData.map((data) => ({
            ...data,
            order: order._id,
            user: new mongoose.Types.ObjectId(userId),
            timeline: [{ status: "pending", at: new Date(), note: "Order placed" }],
        })));

        // 4. the cart is done
        await CartModel.deleteOne({ user: userId });
                // the data for the recommendation engine: what was bought
        lines.forEach((line) => {
        void logInteraction({ user: userId, product: line.product._id, shop: line.product.shop, type: "purchase" })
        })

        const shopOrders = await ShopOrderModel.find({ order: order._id })
            .populate("shop", "_id name slug")
            .lean();
        return { order: order.toObject(), shopOrders: shopOrders };

    }catch(error){
        // undo: delete what was created, and give the stock back
        if(createdOrderId){
            await ShopOrderModel.deleteMany({ order: createdOrderId });
            await OrderModel.deleteOne({ _id: createdOrderId });
        }
        await releaseStock(reserved);
        throw error;
    }
}