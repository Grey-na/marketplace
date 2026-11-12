import { z } from "zod";
import { CATEGORY_COLORS } from "../../types/Category";

const titleRule = z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title must be at most 100 characters");
const statusRule = z.enum(["active", "inactive"], "Status can be active or inactive");
const colorRule = z.enum(CATEGORY_COLORS, "Color must be pink, lavender, butter, mint or coral");

export const CategoryCreateSchema = z.object({
    title: titleRule,
    status: statusRule.default("inactive"),
    color: colorRule.default("pink"),
})

export const CategoryUpdateSchema = z.object({
    title: titleRule.optional(),
    status: statusRule.optional(),
    color: colorRule.optional(),
})