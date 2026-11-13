import fs from "node:fs/promises";
import path from "node:path";
import { type Request } from "express";
import { AppConfig } from "../config/AppConfig";

/**
 * @description Turn an uploaded file into the object we save in the database
 * @param dir folder name used by the Uploader, for example "/categories/"
 */
export const mapImage = (file: Express.Multer.File, dir: string = "/") => {
    return {
        originalname: file.originalname,
        filename: file.filename,
        size: file.size,
        path: dir + file.filename,                    // used later to delete the file
        url: AppConfig.assetsUrl + dir + file.filename,
    }
}

// delete a file but never crash if it is already gone
const safeUnlink = async (filePath: string) => {
    try{
        await fs.unlink(filePath)
    }catch{
        // file does not exist: nothing to do
    }
}

/**
 * @description Delete an image using the "path" we stored, for example "/categories/abc.png"
 */
export const removeImage = async (storedPath?: string | null) => {
    if(!storedPath){
        return;
    }
    const root = path.resolve(AppConfig.uploadDir);
    // remove the leading slash, otherwise resolve() would treat it as the drive root
    const fullPath = path.resolve(root, storedPath.replace(/^[/\\]+/, ""));

    // safety: only ever delete files inside the uploads folder
    if(!fullPath.startsWith(root + path.sep)){
        return;
    }
    await safeUnlink(fullPath)
}

/**
 * @description Delete the files multer just saved for this request (used when the request fails)
 */
export const removeUploadedFiles = async (req: Request) => {
    const files: Express.Multer.File[] = [];
    if(req.file){
        files.push(req.file)
    }
    if(Array.isArray(req.files)){
        // upload.array("images")
        files.push(...req.files)
    }else if(req.files){
        // upload.fields([{ name: "logo" }, { name: "cover" }]) gives { logo: [file], cover: [file] }
        Object.values(req.files).forEach((list) => files.push(...list))
    }
    await Promise.all(files.map((file) => safeUnlink(file.path)))
}