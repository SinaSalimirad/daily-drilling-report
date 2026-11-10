import { t } from "elysia";

// Request validation. Also the source of truth for the OpenAPI/typed contract.
export const createReportBody = t.Object({
  wellName: t.String({ minLength: 1, maxLength: 120 }),
  reportDate: t.String({ format: "date" }),
  depthM: t.Integer({ minimum: 0 }),
  mudWeightPpg: t.Number({ minimum: 0 }),
  notes: t.Optional(t.String({ maxLength: 2000 })),
});

export const reportIdParams = t.Object({ id: t.Numeric() });
