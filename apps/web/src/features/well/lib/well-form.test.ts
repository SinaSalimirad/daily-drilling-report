/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import type { Well } from "../type";
import {
  defaultValues,
  isValidDate,
  needsWaterDepth,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
  type WellFormValues,
} from "./well-form";

const onshoreValues: WellFormValues = {
  projectId: "project-1",
  name: "AZN-101",
  designation: "exploration",
  spudDate: "2026-01-12",
  wellType: "Vertical",
  rigName: "NDC-110",
  rigType: "onshore",
  waterDepthM: "",
};

const offshoreValues: WellFormValues = {
  ...onshoreValues,
  rigType: "offshore",
  waterDepthM: "65.5",
};

const errorsFor = (values: WellFormValues, overrides: Partial<WellFormValues> = {}) =>
  validate({ value: { ...values, ...overrides } })?.fields;

describe("validate", () => {
  it("accepts a valid onshore and a valid offshore well", () => {
    expect(validate({ value: onshoreValues })).toBeUndefined();
    expect(validate({ value: offshoreValues })).toBeUndefined();
  });

  it("reports every required field on an empty form", () => {
    expect(Object.keys(validate({ value: defaultValues })?.fields ?? {}).sort()).toEqual([
      "designation",
      "name",
      "projectId",
      "rigName",
      "rigType",
      "spudDate",
      "wellType",
    ]);
  });

  it.each(["name", "rigName"] as const)("rejects a %s that is only whitespace", (key) => {
    expect(errorsFor(onshoreValues, { [key]: "   " })?.[key]).toBeDefined();
  });

  it("rejects a missing spud date", () => {
    expect(errorsFor(onshoreValues, { spudDate: "" })?.spudDate).toBeDefined();
  });

  it("requires a water depth for an offshore rig", () => {
    expect(errorsFor(offshoreValues, { waterDepthM: "" })?.waterDepthM).toBeDefined();
  });

  it.each(["0", "-3", "abc"])("rejects an offshore water depth of %p", (waterDepthM) => {
    expect(errorsFor(offshoreValues, { waterDepthM })?.waterDepthM).toBeDefined();
  });

  it("ignores a leftover water depth on an onshore rig", () => {
    expect(errorsFor(onshoreValues, { waterDepthM: "abc" })).toBeUndefined();
  });
});

describe("spud date", () => {
  it("rejects dates that are not YYYY-MM-DD or not on the calendar", () => {
    for (const spudDate of ["2026-3-1", "01/03/2026", "2026-02-30", "2026-13-01"]) {
      expect(errorsFor(onshoreValues, { spudDate })?.spudDate).toBeDefined();
    }
  });

  it("isValidDate accepts real dates including leap days", () => {
    expect(isValidDate("2026-03-01")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
  });
});

describe("needsWaterDepth", () => {
  it("is true only for offshore", () => {
    expect(needsWaterDepth("offshore")).toBe(true);
    expect(needsWaterDepth("onshore")).toBe(false);
    expect(needsWaterDepth("")).toBe(false);
  });
});

describe("toPayload", () => {
  it("trims names and converts the water depth to a number", () => {
    const payload = toPayload({ ...offshoreValues, name: "  SPD-11A ", rigName: " Alborz " });
    expect(payload).toMatchObject({ name: "SPD-11A", rigName: "Alborz", waterDepthM: 65.5 });
  });

  it("sends null water depth for an onshore rig, even if one was typed", () => {
    expect(toPayload({ ...onshoreValues, waterDepthM: "12" }).waterDepthM).toBeNull();
  });
});

describe("toUpdatePayload", () => {
  it("leaves out the project, which can't be changed", () => {
    const payload = toUpdatePayload(offshoreValues);
    expect("projectId" in payload).toBe(false);
    expect(payload.waterDepthM).toBe(65.5);
  });
});

describe("toFormValues", () => {
  const well: Well = {
    id: "w1",
    projectId: "project-1",
    name: "SPD-11A",
    designation: "exploration",
    spudDate: "2026-03-02",
    wellType: "Directional",
    rigName: "Alborz",
    rigType: "offshore",
    waterDepthM: 65.5,
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
  };

  it("turns the water depth into text", () => {
    expect(toFormValues(well).waterDepthM).toBe("65.5");
  });

  it("uses an empty string when there is no water depth", () => {
    expect(toFormValues({ ...well, rigType: "onshore", waterDepthM: null }).waterDepthM).toBe("");
  });

  it("round-trips through toPayload", () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...expected } = well;
    expect(toPayload(toFormValues(well))).toEqual(expected);
  });
});
