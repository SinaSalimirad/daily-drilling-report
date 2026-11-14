import { migrate } from "drizzle-orm/node-postgres/migrator";

// Runs once before any test file is loaded (registered in ../bunfig.toml), so it decides which
// database `@/db` connects to. Top-level `await` is fine here: Bun waits for this file to finish
// before it starts loading tests.
//
// - Without TEST_DATABASE_URL only the unit tests run; the database tests are skipped.
// - With it, DATABASE_URL is pointed at that database and the migrations are applied.
//   Its name must end in "_test": the database tests truncate every table.

// Rate limits have their own tests; here they would only make the database tests flaky.
process.env.RATE_LIMIT_MAX = "100000";
process.env.RATE_LIMIT_WRITE_MAX = "100000";
process.env.RATE_LIMIT_LOGIN_MAX = "100000";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL must name a database ending in "_test", got "${databaseName}"`,
    );
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  const { db } = await import("@/db");
  await migrate(db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
} else {
  // env.ts requires a DATABASE_URL; unit tests never connect to it.
  process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
}
