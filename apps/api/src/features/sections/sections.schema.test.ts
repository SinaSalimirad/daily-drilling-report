import { describe, expect, it } from "bun:test";
import { insertSectionSchema, updateSectionSchema } from "./sections.schema";

const wellId = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const section = { wellId, sequence: 1, name: '17 1/2" hole' };

describe("insertSectionSchema", () => {
  it("accepts a valid section", () => {
    expect(insertSectionSchema.safeParse(section).success).toBe(true);
  });

  it("rejects a well id that is not a uuid", () => {
    expect(insertSectionSchema.safeParse({ ...section, wellId: "abc" }).success).toBe(false);
  });

  it.each([0, -1, 1.5])("rejects a sequence of %p", (sequence) => {
    expect(insertSectionSchema.safeParse({ ...section, sequence }).success).toBe(false);
  });

  it("rejects a name that is only whitespace", () => {
    expect(insertSectionSchema.safeParse({ ...section, name: "   " }).success).toBe(false);
  });

  it("trims the name", () => {
    const result = insertSectionSchema.safeParse({ ...section, name: "  Surface  " });
    expect(result.success && result.data.name).toBe("Surface");
  });

  it("rejects a section with a missing field", () => {
    const { name: _name, ...withoutName } = section;
    expect(insertSectionSchema.safeParse(withoutName).success).toBe(false);
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertSectionSchema.safeParse({ ...section, id: "x", createdAt: new Date() });
    expect(result.success && "id" in result.data).toBe(false);
  });
});

describe("updateSectionSchema", () => {
  it("accepts an empty body and a single field", () => {
    expect(updateSectionSchema.safeParse({}).success).toBe(true);
    expect(updateSectionSchema.safeParse({ sequence: 2 }).success).toBe(true);
  });

  it("does not let the client change the well", () => {
    const result = updateSectionSchema.safeParse({ name: "New", wellId });
    expect(result.success && "wellId" in result.data).toBe(false);
  });

  it("still rejects invalid values", () => {
    expect(updateSectionSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateSectionSchema.safeParse({ sequence: 0 }).success).toBe(false);
  });
});
