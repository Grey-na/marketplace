import mongoose, { Schema } from "mongoose";

const PaymentSchema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gateway: { type: String, enum: ["esewa"], required: true },
    // eSewa needs a new unique id for every attempt (letters, digits and hyphens only)
    transactionUuid: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },       // paisa
    status: {
        type: String,
        // refund_needed: money arrived, but the order was cancelled, expired or already paid
        enum: ["initiated", "paid", "failed", "expired", "refund_needed"],
        default: "initiated",
    },
    refId: { type: String, default: null },                 // eSewa's reference for a completed payment
    note: { type: String, default: null },
    rawResponse: { type: Schema.Types.Mixed, default: null },
    paidAt: { type: Date, default: null },
}, {
    timestamps: true,
});

PaymentSchema.index({ order: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const PaymentModel = mongoose.model("Payment", PaymentSchema);
export default PaymentModel;