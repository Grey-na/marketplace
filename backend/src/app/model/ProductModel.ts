import mongoose, { Schema } from "mongoose";
import { ImageSchema, StatusProperties, UserRef } from "./CommonSchema";
import { MIN_PRICE_PAISA } from "../../types/Product";

const ProductSchema = new Schema({
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    title: { type: String, trim: true, minlength: 3, maxlength: 150, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, trim: true, minlength: 20, maxlength: 500, required: true },
    description: { type: String, trim: true, maxlength: 2500, default: null },

    // all money is in paisa (Rs. 999 = 99900)
    price: { type: Number, required: true, min: MIN_PRICE_PAISA },
    discount: { type: Number, min: 0, max: 100, default: 0 },       // percent
    afterDiscount: { type: Number, required: true, min: 0 },        // computed by the hook below
    stock: { type: Number, required: true, min: 0, default: 0 },

    brand: { type: String, trim: true, maxlength: 60, default: null },
    tags: { type: [String], default: [] },
    // shown options such as Size: S, M, L. They do not have separate stock in the MVP
    attributes: [{ _id: false, name: String, values: [String] }],
    highlights: [String],
    shippingPolicy: { type: String, trim: true, maxlength: 500 },
    returnPolicy: { type: String, trim: true, maxlength: 500 },

    images: [ImageSchema],     // the first image is the cover

    // three independent switches decide if visitors can see the product:
    status: StatusProperties,                           // seller: active or inactive
    isBlocked: { type: Boolean, default: false },       // admin: blocked or not
    blockReason: { type: String, default: null },
    // ...and the shop must be approved
    isFeatured: { type: Boolean, default: false },      // admin

    // counters that later steps (reviews, orders, recommendations) will update
    stats: {
        views: { type: Number, default: 0, min: 0 },
        wishlists: { type: Number, default: 0, min: 0 },
        sold: { type: Number, default: 0, min: 0 },
        ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0, min: 0 },
    },

    createdBy: UserRef,
    updatedBy: UserRef,
}, {
    timestamps: true,
});

// the price after discount is calculated in ONE place, every time a product is saved
ProductSchema.pre("validate", function () {
    const price = this.price ?? 0;
    const discount = this.discount ?? 0;
    this.afterDiscount = Math.round(price - (price * discount) / 100);
});

// search: a match in the title counts most, then tags, then brand, then summary
ProductSchema.index(
    { title: "text", tags: "text", brand: "text", summary: "text" },
    { weights: { title: 10, tags: 6, brand: 4, summary: 1 }, name: "product_text" }
);
// category pages and price filters
ProductSchema.index({ status: 1, isBlocked: 1, category: 1, afterDiscount: 1 });
// newest products
ProductSchema.index({ status: 1, isBlocked: 1, createdAt: -1 });
// a shop's products
ProductSchema.index({ shop: 1, createdAt: -1 });

const ProductModel = mongoose.model("Product", ProductSchema);
export default ProductModel;