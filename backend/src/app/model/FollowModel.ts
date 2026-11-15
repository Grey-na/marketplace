import mongoose, { Schema } from "mongoose";

const FollowSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
}, {
    timestamps: true,
});

// one follow per customer and shop. This also protects against double clicks
FollowSchema.index({ user: 1, shop: 1 }, { unique: true });
FollowSchema.index({ shop: 1 });

const FollowModel = mongoose.model("Follow", FollowSchema);
export default FollowModel;