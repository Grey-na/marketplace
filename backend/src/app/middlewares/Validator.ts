import { type Request, type Response, type NextFunction } from "express";
import { type ZodType } from "zod";
import ApiError from "../errors/ApiError";
import { removeUploadedFiles } from "../../utilities/helper";

export const validateBody = (schema: ZodType) => {
    return async (req: Request, _: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body ?? {});
      

        if(!result.success){
            // multer already saved the file before we validated, so delete it now
            await removeUploadedFiles(req);

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