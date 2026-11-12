import { type Request, type Response, type NextFunction } from "express";
import ApiError from "../errors/ApiError";
import { type UserRole } from "../../types/User";

// usage: router.post("/category", Auth(), Allow("admin"), ...)
export default function Allow(...roles: UserRole[]){
    return (req: Request, _: Response, next: NextFunction) => {
        const user = req.loggedInUser;
        if(!user){
            return next(new ApiError("Please login first", 401))
        }
        if(!roles.includes(user.role)){
            return next(new ApiError("You are not allowed to do this", 403))
        }
        next();
    }
}