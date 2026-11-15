import mongoose, { Schema } from "mongoose";

const ReviewSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    // the delivered parcel that proves the purchase
    shopOrder: { type: Schema.Types.ObjectId, ref: "ShopOrder", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: null },
}, {
    timestamps: true,
});

// one review per customer and product
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ shop: 1 });

const ReviewModel = mongoose.model("Review", ReviewSchema);
export default ReviewModel;