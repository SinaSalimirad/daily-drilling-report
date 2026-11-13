import { Elysia } from "elysia";

const FOREIGN_KEY_VIOLATION = "23503";

// drizzle wraps the driver error in `cause`; node-postgres puts the SQLSTATE in `code`.
const isForeignKeyViolation = (error: unknown) => {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  const code = cause?.code ?? (error as { code?: string } | null)?.code;

  return code === FOREIGN_KEY_VIOLATION;
};

// Rows are protected with `onDelete: "restrict"`, so deleting a row that other tables still
// reference fails in the database. Turn that into a 409 for every route instead of a 500.
export const dbErrorsPlugin = new Elysia({ name: "db-errors" }).onError(
  { as: "global" },
  ({ error, status }) => {
    if (isForeignKeyViolation(error)) {
      return status(409, {
        message: "This record is used elsewhere and can't be deleted or changed.",
      });
    }
  },
);
