import mongoose, { Schema } from "mongoose";
import { INTERACTION_TYPES } from "../../types/Interaction";

const InteractionSchema = new Schema({
    // a logged in customer, or an anonymous visitor identified by a random id from the browser
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    anonId: { type: String, default: null },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    type: { type: String, enum: [...INTERACTION_TYPES], required: true },
}, {
    // events are never edited, so there is no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
});

InteractionSchema.index({ user: 1, createdAt: -1 });
InteractionSchema.index({ anonId: 1, createdAt: -1 });
InteractionSchema.index({ product: 1, type: 1 });
// old events delete themselves after 180 days, so the collection does not grow forever
InteractionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const InteractionModel = mongoose.model("Interaction", InteractionSchema);
export default InteractionModel;