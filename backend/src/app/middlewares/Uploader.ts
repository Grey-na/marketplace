import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import * as crypto from "crypto";
import ApiError from "../errors/ApiError";
import { AppConfig } from "../../config/AppConfig";

/**
 * @param dir folder inside the uploads folder, for example "/categories"
 */
export default function Uploader(dir: string = "/"){
    const uploadPath = path.join(AppConfig.uploadDir, dir);

    // only real image types (svg can carry scripts, csv/json/doc are not images)
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

    const myStorage = multer.diskStorage({
        destination: (_, __, cb) => {
            if(!fs.existsSync(uploadPath)){
                fs.mkdirSync(uploadPath, { recursive: true })
            }
            cb(null, uploadPath)
        },
        filename: (_, file: Express.Multer.File, cb) => {
            // random name + the original extension. The user's file name is never used
            const randomName = crypto.randomBytes(16).toString("hex");
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${randomName}${ext}`)
        }
    })

    const fileFilter = (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
        if(allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)){
            cb(null, true)
        }else{
            cb(new ApiError("File format not supported", 400, {
                [file.fieldname]: "Only jpg, png, webp, gif or avif images are allowed"
            }))
        }
    }

    return multer({
        storage: myStorage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 3 * 1024 * 1024,   // 3 MB
            files: 8,
        }
    })
}