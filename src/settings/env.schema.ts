import { z } from "zod";

export const envSchema = z.object({
	BOT_TOKEN: z.string({ description: "Discord Bot Token is required" }).min(1),
	WEBHOOK_LOGS_URL: z.string().url().optional(),
	DATABASE_URL: z.string({ description: "Database URL is required" }).min(1),
	PASSWORD: z
		.string({
			description: "Password is required",
		})
		.min(1),
	// Env vars...
});
