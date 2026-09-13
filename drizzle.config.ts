import type {Config} from "drizzle-kit"

const DATABASE_URL = "postgres://postgres:postgres@localhost:5432/daily-drilling-report"

export default {
    schema: "apps/api/src/db/schema/",
    dialect: "postgresql",
    out: "drizzle",
    dbCredentials: {
        url: DATABASE_URL
    }
} satisfies Config