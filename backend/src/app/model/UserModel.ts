import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
    fullName: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 50,
        required: true,
    },
    // the username is the email. lowercase + trim means A@x.com and a@x.com are the same account
    username: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        unique: true,
    },
    // select:false means queries never return the password unless we ask for it on purpose
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ["admin", "customer", "seller"],
        default: "customer",
    },
    phone: {
        type: String,
        trim: true,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "suspended"],
        default: "active",
    },
}, {
    timestamps: true,
});

const UserModel = mongoose.model("User", UserSchema);
export default UserModel;