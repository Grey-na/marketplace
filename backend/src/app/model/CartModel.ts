import mongoose, { Schema } from "mongoose";
import { MAX_QTY_PER_ITEM } from "../../types/Order";

const CartSchema = new Schema({
    // one cart per user (the unique index enforces it)
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // only the product and the quantity. The price is always read live from the product
    items: [{
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1, max: MAX_QTY_PER_ITEM },
    }],
}, {
    timestamps: true,
});

const CartModel = mongoose.model("Cart", CartSchema);
export default CartModel;