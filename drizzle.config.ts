import type {Config} from "drizzle-kit"

const DATABASE_URL = ""

export default {
    schema: "./apps/api",
    dialect: "postgresql",
    out: "./drizzle",
    dbCredentials: {
        url: DATABASE_URL
    }
} satisfies Config