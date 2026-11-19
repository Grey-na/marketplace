import mongoose, { Schema } from "mongoose";
import { UserRef } from "./CommonSchema";
import { DELIVERY_PROVIDERS, SHOP_ORDER_STATUSES } from "../../types/Order";

const ShopOrderSchema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },   // the customer

    // snapshots: a copy of each item as it was bought
    items: [{
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        title: String,
        slug: String,
        image: { type: String, default: null },
        unitPrice: Number,        // price after discount, per piece
        originalPrice: Number,
        discount: Number,
        quantity: Number,
        lineTotal: Number,
    }],

    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    status: { type: String, enum: [...SHOP_ORDER_STATUSES], default: "pending" },

    // who delivers it. Seller, our own staff, or a courier company: all fit here without changing the schema
    shipment: {
        provider: { type: String, enum: [...DELIVERY_PROVIDERS], default: "seller" },
        trackingNo: { type: String, default: null },
        status: { type: String, default: null },
        assignedTo: UserRef,
    },

    timeline: [{
        _id: false,
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
    }],
        // set when a PAID online parcel is cancelled. The admin refunds it in the eSewa merchant portal
    refund: {
        status: { type: String, enum: ["none", "pending", "refunded"], default: "none" },
        amount: { type: Number, default: 0 },
        note: { type: String, default: null },
        refundedAt: { type: Date, default: null },
    },
}, {
    timestamps: true,
});

ShopOrderSchema.index({ order: 1 });
ShopOrderSchema.index({ shop: 1, status: 1, createdAt: -1 });
ShopOrderSchema.index({ user: 1, createdAt: -1 });

const ShopOrderModel = mongoose.model("ShopOrder", ShopOrderSchema);
export default ShopOrderModel;