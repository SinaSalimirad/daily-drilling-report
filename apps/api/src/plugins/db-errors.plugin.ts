import { Elysia } from "elysia";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

// drizzle wraps the driver error in `cause`; node-postgres puts the SQLSTATE in `code`.
const sqlState = (error: unknown) => {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;

  return cause?.code ?? (error as { code?: string } | null)?.code;
};

// Constraint errors come from the database. Turn them into a client error for every route
// instead of a 500. The same SQLSTATE means different things depending on the request:
//
//   23503 on DELETE        -> the row is still referenced (a project that has wells)        409
//   23503 on POST / PATCH  -> the body points at a row that does not exist, or at a parent
//                             that belongs to someone else (a section of another well)     422
//   23505                  -> a duplicate (same name, same report + product, ...)            409
//   23514                  -> a value the table rejects (e.g. width without height)          422
export const dbErrorsPlugin = new Elysia({ name: "db-errors" }).onError(
  { as: "global" },
  ({ error, request, status }) => {
    const code = sqlState(error);

    if (code === FOREIGN_KEY_VIOLATION) {
      if (request.method === "DELETE") {
        return status(409, {
          message: "This record is used elsewhere and can't be deleted.",
        });
      }

      return status(422, {
        message: "A referenced record does not exist or belongs to a different parent.",
      });
    }

    if (code === UNIQUE_VIOLATION) {
      return status(409, { message: "A record with the same values already exists." });
    }

    if (code === CHECK_VIOLATION) {
      return status(422, { message: "One of the values is not allowed by the database." });
    }
  },
);
