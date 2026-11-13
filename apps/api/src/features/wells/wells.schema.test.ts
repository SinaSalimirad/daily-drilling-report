import { describe, expect, it } from "bun:test";
import { RigType } from "../projects/projects.schema";
import { Designation, insertWellSchema, updateWellSchema, WellType } from "./wells.schema";

const projectId = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";

const onshoreWell = {
  projectId,
  name: "AZN-12",
  designation: Designation.Exploration,
  spudDate: "2026-03-01",
  wellType: WellType.Vertical,
  rigName: "NDC-110",
  rigType: RigType.Onshore,
};

const offshoreWell = {
  ...onshoreWell,
  name: "SP-5",
  rigName: "Iran Alborz",
  rigType: RigType.Offshore,
  waterDepthM: 65.5,
};

describe("insertWellSchema", () => {
  it("accepts an onshore well without water depth", () => {
    expect(insertWellSchema.safeParse(onshoreWell).success).toBe(true);
  });

  it("accepts an offshore well with water depth", () => {
    expect(insertWellSchema.safeParse(offshoreWell).success).toBe(true);
  });

  it("accepts null water depth for an onshore well", () => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, waterDepthM: null }).success).toBe(true);
  });

  it("rejects an offshore well without water depth", () => {
    const { waterDepthM: _depth, ...withoutDepth } = offshoreWell;
    expect(insertWellSchema.safeParse(withoutDepth).success).toBe(false);
  });

  it("rejects an onshore well with water depth", () => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, waterDepthM: 10 }).success).toBe(false);
  });

  it.each([0, -5])("rejects a water depth of %p", (waterDepthM) => {
    expect(insertWellSchema.safeParse({ ...offshoreWell, waterDepthM }).success).toBe(false);
  });

  it("rejects a project id that is not a uuid", () => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, projectId: "abc" }).success).toBe(false);
  });

  it.each(["name", "rigName"] as const)("rejects a %s that is only whitespace", (key) => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, [key]: "   " }).success).toBe(false);
  });

  it("trims names", () => {
    const result = insertWellSchema.safeParse({ ...onshoreWell, name: "  AZN-12  " });
    expect(result.success && result.data.name).toBe("AZN-12");
  });

  it("rejects a spud date that is not a calendar date", () => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, spudDate: "2026-02-30" }).success).toBe(
      false,
    );
    expect(insertWellSchema.safeParse({ ...onshoreWell, spudDate: "01/03/2026" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown designation or well type", () => {
    expect(insertWellSchema.safeParse({ ...onshoreWell, designation: "x" }).success).toBe(false);
    expect(insertWellSchema.safeParse({ ...onshoreWell, wellType: "Curved" }).success).toBe(false);
  });

  it("rejects a well with a missing field", () => {
    const { rigName: _rigName, ...withoutRig } = onshoreWell;
    expect(insertWellSchema.safeParse(withoutRig).success).toBe(false);
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertWellSchema.safeParse({ ...onshoreWell, id: "x", createdAt: new Date() });
    expect(result.success && "id" in result.data).toBe(false);
  });
});

describe("updateWellSchema", () => {
  it("accepts an empty body", () => {
    expect(updateWellSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a single field that is not rig related", () => {
    expect(updateWellSchema.safeParse({ rigName: "NDC-111" }).success).toBe(true);
  });

  it("does not let the client change the project", () => {
    const result = updateWellSchema.safeParse({ name: "New", projectId });
    expect(result.success && "projectId" in result.data).toBe(false);
  });

  it("accepts onshore with null water depth", () => {
    const body = { rigType: RigType.Onshore, waterDepthM: null };
    expect(updateWellSchema.safeParse(body).success).toBe(true);
  });

  it("accepts offshore with water depth", () => {
    const body = { rigType: RigType.Offshore, waterDepthM: 80 };
    expect(updateWellSchema.safeParse(body).success).toBe(true);
  });

  it("rejects rigType without waterDepthM and the other way round", () => {
    expect(updateWellSchema.safeParse({ rigType: RigType.Offshore }).success).toBe(false);
    expect(updateWellSchema.safeParse({ waterDepthM: 80 }).success).toBe(false);
  });

  it("rejects offshore with null water depth and onshore with a water depth", () => {
    expect(
      updateWellSchema.safeParse({ rigType: RigType.Offshore, waterDepthM: null }).success,
    ).toBe(false);
    expect(updateWellSchema.safeParse({ rigType: RigType.Onshore, waterDepthM: 10 }).success).toBe(
      false,
    );
  });

  it("still rejects invalid values", () => {
    expect(updateWellSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateWellSchema.safeParse({ spudDate: "nope" }).success).toBe(false);
  });
});
