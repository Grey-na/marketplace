import { type Request, type Response, type NextFunction } from "express";
import { type ZodType } from "zod";
import ApiError from "../errors/ApiError";

export const validateBody = (schema: ZodType) => {
    return (req: Request, _: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if(!result.success){
            // { fieldName: "message" } so the frontend can show each error under its input
            const errBag: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                const key = issue.path.join(".") || "body";
                if(!errBag[key]){
                    errBag[key] = issue.message;
                }
            });
            return next(new ApiError("Validation Failed", 400, errBag));
        }

        // from here on req.body holds the cleaned data (trimmed, lowercased, defaults applied)
        req.body = result.data;
        next();
    }
}

export default validateBody;