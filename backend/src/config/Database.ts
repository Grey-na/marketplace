import mongoose from "mongoose";
import { AppConfig, MongoConfig } from "./AppConfig";

export const connectDB = async () => {
    await mongoose.connect(MongoConfig.url, {
        dbName: MongoConfig.dbName,
        autoCreate: true,
        autoIndex: !AppConfig.isProduction,   // building indexes automatically is for development only
    })
    console.log("MongoDB connected")
}