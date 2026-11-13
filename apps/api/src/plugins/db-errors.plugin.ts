import { Elysia } from "elysia";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

// drizzle wraps the driver error in `cause`; node-postgres puts the SQLSTATE in `code`.
const sqlState = (error: unknown) => {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;

  return cause?.code ?? (error as { code?: string } | null)?.code;
};

// Constraint errors come from the database: a row still referenced elsewhere (delete) or a
// duplicate (create / update). Turn them into a 409 for every route instead of a 500.
export const dbErrorsPlugin = new Elysia({ name: "db-errors" }).onError(
  { as: "global" },
  ({ error, status }) => {
    const code = sqlState(error);

    if (code === FOREIGN_KEY_VIOLATION) {
      return status(409, {
        message: "This record is used elsewhere and can't be deleted or changed.",
      });
    }

    if (code === UNIQUE_VIOLATION) {
      return status(409, { message: "A record with the same values already exists." });
    }
  },
);
