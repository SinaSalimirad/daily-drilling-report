import { describe, expect, it } from "bun:test";
import { CurrencyCode, insertProjectSchema, RigType, updateProjectSchema } from "./projects.schema";

const validProject = {
  name: "Azadegan 2",
  operators: ["NIOC"],
  contractors: ["NIDC"],
  field: "Azadegan",
  rigName: "NDC-110",
  rigType: RigType.Onshore,
  currencyCode: CurrencyCode.Dollar,
};

describe("insertProjectSchema", () => {
  it("accepts a valid project", () => {
    expect(insertProjectSchema.safeParse(validProject).success).toBe(true);
  });

  it("accepts two operators and two contractors", () => {
    const result = insertProjectSchema.safeParse({
      ...validProject,
      operators: ["NIOC", "Total"],
      contractors: ["NIDC", "ISOC"],
    });
    expect(result.success).toBe(true);
  });

  it.each(["operators", "contractors"] as const)("rejects an empty %s list", (key) => {
    expect(insertProjectSchema.safeParse({ ...validProject, [key]: [] }).success).toBe(false);
  });

  it.each(["operators", "contractors"] as const)("rejects three %s", (key) => {
    expect(insertProjectSchema.safeParse({ ...validProject, [key]: ["A", "B", "C"] }).success).toBe(
      false,
    );
  });

  it.each(["name", "field", "rigName"] as const)("rejects a %s that is only whitespace", (key) => {
    expect(insertProjectSchema.safeParse({ ...validProject, [key]: "   " }).success).toBe(false);
  });

  it("rejects a blank operator name", () => {
    expect(insertProjectSchema.safeParse({ ...validProject, operators: [" "] }).success).toBe(
      false,
    );
  });

  it("trims names", () => {
    const result = insertProjectSchema.safeParse({ ...validProject, name: "  Azadegan 2  " });
    expect(result.success && result.data.name).toBe("Azadegan 2");
  });

  it("rejects an unknown rig type", () => {
    expect(insertProjectSchema.safeParse({ ...validProject, rigType: "floating" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown currency", () => {
    expect(insertProjectSchema.safeParse({ ...validProject, currencyCode: "JPY" }).success).toBe(
      false,
    );
  });

  it("rejects a project with a missing field", () => {
    const { field: _field, ...withoutField } = validProject;
    expect(insertProjectSchema.safeParse(withoutField).success).toBe(false);
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertProjectSchema.safeParse({
      ...validProject,
      id: "x",
      createdAt: new Date(),
    });
    expect(result.success && "id" in result.data).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  it("accepts a single field", () => {
    expect(updateProjectSchema.safeParse({ rigName: "NDC-111" }).success).toBe(true);
  });

  it("accepts an empty body", () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(true);
  });

  it("still rejects invalid values", () => {
    expect(updateProjectSchema.safeParse({ operators: ["A", "B", "C"] }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ currencyCode: "JPY" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
