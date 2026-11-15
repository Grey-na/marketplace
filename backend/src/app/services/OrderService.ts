import mongoose from "mongoose";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ProductModel from "../model/ProductModel";
import ApiError from "../errors/ApiError";

/**
 * @description Give the stock of cancelled items back (the opposite of what checkout did)
 */
const restoreStock = async (items: Array<{ product: mongoose.Types.ObjectId; quantity?: number | null }>) => {
    await Promise.allSettled(items.map((item) =>
        ProductModel.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity ?? 0, "stats.sold": -(item.quantity ?? 0) } }
        )
    ));
}

/**
 * @description The status of the whole Order is worked out from its parcels (never typed by hand)
 */
export const syncOrderStatus = async (orderId: mongoose.Types.ObjectId) => {
    const parcels = await ShopOrderModel.find({ order: orderId }, { status: 1 }).lean();
    const active = parcels.filter((parcel) => parcel.status !== "cancelled");

    let status: "placed" | "processing" | "completed" | "cancelled";
    if(active.length === 0){
        status = "cancelled";
    }else if(active.every((parcel) => parcel.status === "delivered")){
        status = "completed";
    }else if(active.some((parcel) => parcel.status !== "pending")){
        status = "processing";
    }else{
        status = "placed";
    }

    await OrderModel.updateOne({ _id: orderId }, { $set: { status: status } });

    // cash on delivery: the money has been collected once every active parcel is delivered
    if(status === "completed"){
        await OrderModel.updateOne(
            { _id: orderId, "payment.method": "cod" },
            { $set: { "payment.status": "paid" } }
        );
    }
}

type ChangeOptions = {
    shopOrderId: string;
    // who may touch this parcel: { shop: shopId } for a seller, { user: userId } for the customer
    ownerFilter: Record<string, unknown>;
    to: string;
    allowedTransitions: Record<string, string[]>;
    note?: string;
    // extra fields to set together with the status, for example shipment.trackingNo
    set?: Record<string, unknown>;
}

/**
 * @description Move a parcel to a new status, following the allowed transitions
 */
export const changeShopOrderStatus = async (options: ChangeOptions) => {
    const { shopOrderId, ownerFilter, to, allowedTransitions, note, set } = options;

    // 1. find the parcel. Someone else's parcel looks the same as a missing one
    const current = await ShopOrderModel.findOne({ _id: shopOrderId, ...ownerFilter }, { status: 1 }).lean();
    if(!current){
        throw new ApiError("Order not found", 404)
    }

    // 2. is this move allowed from the current status?
    const allowedTargets = allowedTransitions[current.status] ?? [];
    if(!allowedTargets.includes(to)){
        throw new ApiError("Validation Failed", 400, {
            status: `A ${current.status} order cannot be changed to ${to}`,
        })
    }

    // 3. the change itself. "status: current.status" makes it atomic: it only
    //    happens if nobody changed the parcel since we read it
    const updated = await ShopOrderModel.findOneAndUpdate(
        { _id: shopOrderId, ...ownerFilter, status: current.status },
        {
            $set: { status: to, ...(set ?? {}) },
            $push: { timeline: { status: to, at: new Date(), note: note ?? null } },
        },
        { new: true }
    );
    if(!updated){
        throw new ApiError("This order was just changed. Please refresh and try again.", 409)
    }

    // 4. follow-up work
    if(to === "cancelled"){
        await restoreStock(updated.items)
    }
    await syncOrderStatus(updated.order)

    return updated;
}