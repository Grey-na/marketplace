import { type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import ApiError from "../errors/ApiError";
import { AppConfig } from "../../config/AppConfig";

// send the limit error through ErrorHandler so the JSON shape stays the same
const tooManyRequests = (_: Request, __: Response, next: NextFunction) => {
    next(new ApiError("Too many requests, please try again later", 429))
}

// general limit for the whole API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})

// strict limit for login, register and refresh (stops password guessing). Used from Step 2.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: AppConfig.isProduction ? 10 : 100,   // relaxed in development so testing is not blocked
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
})