import mongoose from "mongoose";

// one saved image
export const ImageSchema = new mongoose.Schema({
    originalname: String,
    filename: String,
    path: String,
    size: Number,
    url: String,
}, {
    _id: false
})

export const StatusProperties = {
    type: String,
    enum: ["active", "inactive"],
    default: "inactive",
};

// a link to the user who created or changed a document
export const UserRef = {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    required: false,
}