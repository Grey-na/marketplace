import crypto from "crypto";
import mongoose from "mongoose";
import PaymentModel from "../model/PaymentModel";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ApiError from "../errors/ApiError";
import { AppConfig } from "../../config/AppConfig";
import { SYSTEM_TRANSITIONS } from "../../types/Order";
import { buildEsewaFormFields, checkEsewaStatus } from "./EsewaService";
import { changeShopOrderStatus } from "./OrderService";
import { logInteraction } from "./InteractionService";

// if eSewa keeps saying "pending" or cannot be reached, we do not cancel before this time
const HARD_LIMIT_MS = 2 * 60 * 60 * 1000;

export type VerifyResult = { outcome: "paid" | "pending" | "failed"; orderNo: string | null };

const isExpired = (createdAt: Date | string): boolean => {
    return Date.now() - new Date(createdAt).getTime() > AppConfig.paymentExpiryMinutes * 60 * 1000;
}

/**
 * @description Start a payment attempt for an order. Returns the link that sends the customer to eSewa
 */
export const createEsewaPayment = async (order: {
    _id: mongoose.Types.ObjectId; orderNo: string; user: mongoose.Types.ObjectId; total: number; createdAt: Date;
}) => {
    // a new unique id for every attempt: eSewa does not accept the same one twice
    const transactionUuid = `${order.orderNo}-${crypto.randomBytes(3).toString("hex")}`;

    const payment = await PaymentModel.create({
        order: order._id,
        user: order.user,
        gateway: "esewa",
        transactionUuid: transactionUuid,
        amount: order.total,
    });

    return {
        paymentId: payment._id,
        transactionUuid: transactionUuid,
        payUrl: `${AppConfig.backendUrl}/api/payments/esewa/pay/${transactionUuid}`,
        expiresAt: new Date(new Date(order.createdAt).getTime() + AppConfig.paymentExpiryMinutes * 60 * 1000),
    };
}

/**
 * @description The signed form for the "redirecting to eSewa" page. Only valid while the order waits for payment
 */
export const getEsewaPayForm = async (transactionUuid: string) => {
    const payment = await PaymentModel.findOne({ transactionUuid: transactionUuid, gateway: "esewa", status: "initiated" });
    if(!payment){
        throw new ApiError("Payment not found", 404)
    }
    const order = await OrderModel.findById(payment.order);
    if(!order || order.status !== "awaiting_payment" || isExpired(order.createdAt)){
        throw new ApiError("This payment link is no longer valid", 410)
    }

    return {
        formUrl: AppConfig.esewa.formUrl,
        fields: buildEsewaFormFields({
            subtotal: order.subtotal,
            deliveryCharge: order.deliveryCharge,
            total: payment.amount,
            transactionUuid: transactionUuid,
        }),
    };
}

/**
 * @description The money really arrived: confirm the order. Safe to call many times
 */
const markPaid = async (
    payment: InstanceType<typeof PaymentModel>,
    order: InstanceType<typeof OrderModel>,
    refId: string | null,
    raw: Record<string, unknown>
): Promise<VerifyResult> => {
    const paid: VerifyResult = { outcome: "paid", orderNo: order.orderNo };
    const failed: VerifyResult = { outcome: "failed", orderNo: order.orderNo };

    // only the first call can move the payment from "initiated" to "paid"
    const first = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, status: "initiated" },
        { $set: { status: "paid", refId: refId, paidAt: new Date(), rawResponse: raw } },
        { new: true }
    );
    if(!first){
        const fresh = await PaymentModel.findById(payment._id);
        if(fresh?.status === "paid"){
            return paid;           // already handled
        }
        // paid, but this attempt had expired or failed: the customer needs a refund
        await PaymentModel.updateOne({ _id: payment._id }, {
            $set: { status: "refund_needed", refId: refId, rawResponse: raw, note: "Payment arrived after this attempt had ended" },
        });
        return failed;
    }

    // the order is waiting for payment: confirm it
    const activated = await OrderModel.findOneAndUpdate(
        { _id: order._id, status: "awaiting_payment" },
        { $set: { status: "placed", "payment.status": "paid", "payment.txnId": refId } }
    );
    if(!activated){
        // another attempt already paid it, or it was cancelled: this money has to go back
        await PaymentModel.updateOne({ _id: payment._id }, {
            $set: { status: "refund_needed", note: "The order was no longer waiting for payment" },
        });
        return failed;
    }

    // sellers can see the parcels from now on
    await ShopOrderModel.updateMany(
        { order: order._id, status: "awaiting_payment" },
        { $set: { status: "pending" }, $push: { timeline: { status: "pending", at: new Date(), note: "Payment received" } } }
    );

    // the recommendation engine learns from the purchase
    const parcels = await ShopOrderModel.find({ order: order._id }, { shop: 1, items: 1 }).lean();
    parcels.forEach((parcel) => parcel.items.forEach((item) => {
        void logInteraction({ user: String(order.user), product: item.product, shop: parcel.shop, type: "purchase" })
    }))

    return paid;
}

/**
 * @description Ask eSewa what happened to this payment attempt, and update our records
 */
export const verifyEsewaPayment = async (transactionUuid: string): Promise<VerifyResult> => {
    const payment = await PaymentModel.findOne({ transactionUuid: transactionUuid, gateway: "esewa" });
    if(!payment){
        throw new ApiError("Payment not found", 404)
    }
    const order = await OrderModel.findById(payment.order);
    if(!order){
        throw new ApiError("Order not found", 404)
    }
    if(payment.status === "paid"){
        return { outcome: "paid", orderNo: order.orderNo };
    }

    let remote;
    try{
        remote = await checkEsewaStatus(transactionUuid, payment.amount);
    }catch(error){
        // eSewa could not be reached: we do not know. Stay pending, the sweeper asks again later
        console.error("eSewa status check failed", error)
        return { outcome: "pending", orderNo: order.orderNo };
    }

    if(remote.status === "COMPLETE"){
        // eSewa must confirm the amount WE expect, not an amount the browser reported
        const amountOk = Math.abs(remote.totalAmount - payment.amount / 100) < 0.01;
        if(!amountOk){
            await PaymentModel.updateOne({ _id: payment._id }, {
                $set: { status: "refund_needed", rawResponse: remote.raw, note: "eSewa reported a different amount" },
            });
            return { outcome: "failed", orderNo: order.orderNo };
        }
        return markPaid(payment, order, remote.refId, remote.raw);
    }

    if(remote.status === "PENDING" || remote.status === "AMBIGUOUS"){
        return { outcome: "pending", orderNo: order.orderNo };
    }

    // NOT_FOUND, CANCELED and the like: this attempt did not succeed
    await PaymentModel.updateOne(
        { _id: payment._id, status: "initiated" },
        { $set: { status: "failed", rawResponse: remote.raw } }
    );
    return { outcome: "failed", orderNo: order.orderNo };
}

/**
 * @description Cancel online orders that were never paid, and give their stock back
 */
export const expireUnpaidOrders = async () => {
    const cutoff = new Date(Date.now() - AppConfig.paymentExpiryMinutes * 60 * 1000);
    const orders = await OrderModel.find(
        { status: "awaiting_payment", createdAt: { $lt: cutoff } },
        { _id: 1, createdAt: 1 }
    ).limit(50).lean();

    for(const order of orders){
        // 1. maybe the customer DID pay, and the browser never came back to tell us
        const attempts = await PaymentModel.find({ order: order._id, status: "initiated" });
        let paid = false;
        let uncertain = false;
        for(const attempt of attempts){
            const result = await verifyEsewaPayment(attempt.transactionUuid);
            if(result.outcome === "paid"){
                paid = true;
                break;
            }
            if(result.outcome === "pending"){
                uncertain = true;
            }
        }
        if(paid){
            continue;
        }
        // eSewa said "pending" or could not be reached: wait, unless it has been far too long
        if(uncertain && Date.now() - new Date(order.createdAt).getTime() < HARD_LIMIT_MS){
            continue;
        }

        // 2. nothing was paid: cancel the parcels (the stock goes back automatically)
        const parcels = await ShopOrderModel.find({ order: order._id, status: "awaiting_payment" }, { _id: 1 }).lean();
        for(const parcel of parcels){
            try{
                await changeShopOrderStatus({
                    shopOrderId: String(parcel._id),
                    ownerFilter: {},
                    to: "cancelled",
                    allowedTransitions: SYSTEM_TRANSITIONS,
                    note: "Payment not received in time",
                })
            }catch(error){
                console.error("Could not cancel an unpaid parcel", error)
            }
        }
        await PaymentModel.updateMany({ order: order._id, status: "initiated" }, { $set: { status: "expired" } });
    }
}

/**
 * @description Run the cleanup of unpaid orders every few minutes (one server instance is assumed)
 */
export const startPaymentSweeper = () => {
    const run = async () => {
        try{
            await expireUnpaidOrders()
        }catch(error){
            console.error("Payment sweep failed", error)
        }
    };
    const timer = setInterval(run, AppConfig.paymentSweepSeconds * 1000);
    timer.unref();    // this timer alone must not keep the program alive
}