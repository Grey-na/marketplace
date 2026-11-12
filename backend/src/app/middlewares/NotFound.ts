import { type Request, type Response, type NextFunction } from "express";
import ApiError from "../errors/ApiError";

const NotFound = (_: Request, __: Response, next: NextFunction) => {
    next(new ApiError("Resource/Route not found", 404))
}

export default NotFound