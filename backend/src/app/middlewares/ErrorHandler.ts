import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import ApiError from "../errors/ApiError";

type MongoDuplicateError = {
    name: string;
    code: number;
    keyPattern: Record<string, number>;
}

// type guard: tells TypeScript the unknown error is a duplicate key error
const isMongoDuplicateError = (err: unknown): err is MongoDuplicateError => {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "MongoServerError" &&
        (err as { code?: number }).code === 11000
    );
}

export default function ErrorHandler(err: unknown, _: Request, res: Response, __: NextFunction){
    console.error("******************Exception ****************");
    console.log(err);
    console.error("******************Exception Ends ****************");

    let code: number = 500;
    let result: Record<string, string> | null = null;
    let errMsg: string = "Application Error";

    if(err instanceof ApiError){
        // our own errors
        code = Number(err.code || 500);
        result = err.result || null;
        errMsg = err.message || "Application Error";

    } else if(err instanceof multer.MulterError){
        // upload errors, for example file too large
        code = 400;
        errMsg = "Upload Failed";
        result = {
            [err.field || "file"]: err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message
        };

    } else if(err instanceof mongoose.Error.ValidationError){
        // schema rules (required, minlength, enum ...)
        code = 400;
        errMsg = "Validation Failed";
        const bag: Record<string, string> = {};
        Object.keys(err.errors).forEach((key: string) => {
            bag[key] = err.errors[key].message;
        });
        result = bag;

    } else if(err instanceof mongoose.Error.CastError){
        // for example findById("abc") with an invalid id
        code = 400;
        errMsg = "Validation Failed";
        result = { [err.path]: `Invalid ${err.path}` };

    } else if(isMongoDuplicateError(err)){
        // unique index broken
        code = 400;
        errMsg = "Validation Failed";
        const bag: Record<string, string> = {};
        Object.keys(err.keyPattern).forEach((key: string) => {
            bag[key] = `${key} should be unique`;
        });
        result = bag;
    }

    res.status(code).json({
        result: result,
        message: errMsg
    });
}