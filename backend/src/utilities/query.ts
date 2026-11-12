import { type Request } from "express";

/**
 * @description Escape special regex characters so user text is searched literally
 */
export const escapeRegex = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @description Safe page, limit and skip numbers from the query string
 */
export const getPagination = (req: Request, defaultLimit: number = 20, maxLimit: number = 100) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

/**
 * @description True only for a 24 character hex MongoDB id
 */
export const isObjectId = (value: string): boolean => {
    return /^[a-f\d]{24}$/i.test(value);
}