import { describe, expect, it } from "bun:test";
import { insertReportSchema, updateReportSchema } from "./reports.schema";

const wellId = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const sectionId = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c";

const report = {
  wellId,
  sectionId,
  reportNumber: 1,
  date: "2026-03-01",
  operatorReporter: "A. Rezaei",
  contractorReporter: "B. Karimi",
  wellStatus: "Drilling",
  mudType: "WBM",
  presentActivity: "Drilling 12 1/4 hole",
  bitDepth: 1200.5,
  totalDepth: 1200.5,
  tvd: 1180,
};

describe("insertReportSchema", () => {
  it("accepts a valid report", () => {
    expect(insertReportSchema.safeParse(report).success).toBe(true);
  });

  it.each(["wellId", "sectionId"] as const)("rejects a %s that is not a uuid", (key) => {
    expect(insertReportSchema.safeParse({ ...report, [key]: "abc" }).success).toBe(false);
  });

  it.each([0, -1, 1.5])("rejects a report number of %p", (reportNumber) => {
    expect(insertReportSchema.safeParse({ ...report, reportNumber }).success).toBe(false);
  });

  it("rejects a date that is not a calendar date", () => {
    expect(insertReportSchema.safeParse({ ...report, date: "2026-02-30" }).success).toBe(false);
    expect(insertReportSchema.safeParse({ ...report, date: "01/03/2026" }).success).toBe(false);
  });

  it.each(["bitDepth", "totalDepth", "tvd"] as const)("rejects a %s of zero", (key) => {
    expect(insertReportSchema.safeParse({ ...report, [key]: 0 }).success).toBe(false);
  });

  it.each([
    "operatorReporter",
    "contractorReporter",
    "wellStatus",
    "mudType",
    "presentActivity",
  ] as const)("rejects a %s that is only whitespace", (key) => {
    expect(insertReportSchema.safeParse({ ...report, [key]: "   " }).success).toBe(false);
  });

  it("rejects a report with a missing field", () => {
    const { mudType: _mudType, ...withoutMud } = report;
    expect(insertReportSchema.safeParse(withoutMud).success).toBe(false);
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertReportSchema.safeParse({ ...report, id: "x", createdAt: new Date() });
    expect(result.success && "id" in result.data).toBe(false);
  });
});

describe("updateReportSchema", () => {
  it("accepts an empty body and a single field", () => {
    expect(updateReportSchema.safeParse({}).success).toBe(true);
    expect(updateReportSchema.safeParse({ mudType: "OBM" }).success).toBe(true);
  });

  it("does not let the client change the well", () => {
    const result = updateReportSchema.safeParse({ mudType: "OBM", wellId });
    expect(result.success && "wellId" in result.data).toBe(false);
  });

  it("still rejects invalid values", () => {
    expect(updateReportSchema.safeParse({ tvd: -1 }).success).toBe(false);
    expect(updateReportSchema.safeParse({ date: "nope" }).success).toBe(false);
  });
});
