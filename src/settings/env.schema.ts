import { z } from "zod";

export const envSchema = z.object({
	BOT_TOKEN: z.string().min(1, "Discord Bot Token is required"),
	WEBHOOK_LOGS_URL: z.string().url().optional(),
	DATABASE_URL: z.string().min(1, "Database URL is required"),
	PASSWORD: z.string().min(1, "Password is required"),
	// Env vars...
});
