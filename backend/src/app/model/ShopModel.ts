import mongoose, { Schema } from "mongoose";
import { ImageSchema, UserRef } from "./CommonSchema";
import { SHOP_STATUSES } from "../../types/Shop";

const ShopSchema = new Schema({
    // one seller owns exactly one shop (the unique index enforces it)
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    name: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 60,
        required: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
    },
    logo: ImageSchema,
    cover: ImageSchema,
    contact: {
        phone: { type: String, trim: true, required: true },
        email: { type: String, trim: true, lowercase: true, default: null },
        address: { type: String, trim: true, maxlength: 200, default: null },
    },
    // business registration number: only the seller and admin see it, so the admin can verify the business
    businessRegNo: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
    },

    status: {
        type: String,
        enum: [...SHOP_STATUSES],
        default: "pending",
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    reviewedBy: UserRef,

    // counters. The follow, review and recommendation steps will update these later
    followerCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
}, {
    timestamps: true,
});

// indexes for the public shop list (approved, featured first, newest first, or most followed)
ShopSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
ShopSchema.index({ status: 1, followerCount: -1 });

const ShopModel = mongoose.model("Shop", ShopSchema);
export default ShopModel;