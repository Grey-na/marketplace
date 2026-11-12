import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/Database";
import UserModel from "../app/model/UserModel";

const run = async () => {
    const username = process.env.ADMIN_USERNAME?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    if(!username || !password){
        throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD in .env")
    }

    await connectDB();

    const exists = await UserModel.findOne({ username: username });
    if(exists){
        console.log("Admin already exists:", username)
    }else{
        await UserModel.create({
            fullName: process.env.ADMIN_NAME || "Admin",
            username: username,
            password: await bcrypt.hash(password, 12),
            role: "admin",
            phone: process.env.ADMIN_PHONE || "9800000000",
        })
        console.log("Admin created:", username)
    }

    await mongoose.disconnect();
}

run().catch((exception) => {
    console.error(exception)
    process.exit(1)
})