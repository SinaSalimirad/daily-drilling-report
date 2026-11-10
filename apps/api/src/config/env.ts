import z from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive()
    .default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGINS: z.string().default(""),
})

export const env = envSchema.parse(process.env)