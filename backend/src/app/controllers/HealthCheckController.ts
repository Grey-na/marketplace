import { type Request, type Response } from "express";
import mongoose from "mongoose";

export default class HealthCheckController{
    handleHealthCheck(_: Request, res: Response){
        res.json({
            result: {
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                database: mongoose.connection.readyState === 1 ? "connected" : "not connected",
            },
            message: "Server is running"
        })
    }
}