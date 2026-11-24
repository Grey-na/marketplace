import { z } from "zod";

export const UserStatusSchema = z.object({
    status: z.enum(["active", "suspended"], "Status must be active or suspended"),
})