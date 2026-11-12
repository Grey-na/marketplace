import mongoose, { Schema } from "mongoose";
import { ImageSchema, StatusProperties, UserRef } from "./CommonSchema";
import { CATEGORY_COLORS } from "../../types/Category";

const CategorySchema = new Schema({
    title: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 100,
        required: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    image: ImageSchema,
    // frame color for product cards in this category
    color: {
        type: String,
        enum: [...CATEGORY_COLORS],
        default: "pink",
    },
    status: StatusProperties,
    createdBy: UserRef,
    updatedBy: UserRef,
}, {
    timestamps: true,
});

const CategoryModel = mongoose.model("Category", CategorySchema);
export default CategoryModel;