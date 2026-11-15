import mongoose, { Schema } from "mongoose";
import { PAYMENT_METHODS } from "../../types/Order";

const OrderSchema = new Schema({
    orderNo: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // a copy of the delivery address at the time of the order
    address: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        city: { type: String, required: true },
        street: { type: String, required: true },
        landmark: { type: String, default: null },
    },
    note: { type: String, default: null },

    // all money in paisa
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    payment: {
        method: { type: String, enum: [...PAYMENT_METHODS], required: true },
        status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        txnId: { type: String, default: null },
    },
    status: { type: String, enum: ["placed", "processing", "completed", "cancelled"], default: "placed" },
}, {
    timestamps: true,
});

OrderSchema.index({ user: 1, createdAt: -1 });

const OrderModel = mongoose.model("Order", OrderSchema);
export default OrderModel;