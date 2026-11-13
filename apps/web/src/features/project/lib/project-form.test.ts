/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import type { Project } from "../type";
import {
  defaultValues,
  type ProjectFormValues,
  parseNames,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
} from "./project-form";

const validValues: ProjectFormValues = {
  name: "Azadegan Phase 2",
  field: "Azadegan",
  operators: "NIOC",
  contractors: "NIDC",
  rigName: "NDC-110",
  rigType: "onshore",
  currencyCode: "USD",
};

const errorsFor = (overrides: Partial<ProjectFormValues>) =>
  validate({ value: { ...validValues, ...overrides } })?.fields;

describe("parseNames", () => {
  it("splits on commas and trims each name", () => {
    expect(parseNames(" Shell ,BP  ")).toEqual(["Shell", "BP"]);
  });

  it("drops blank entries such as a trailing comma", () => {
    expect(parseNames("Shell, ,")).toEqual(["Shell"]);
  });

  it("returns an empty list for blank text", () => {
    expect(parseNames("   ")).toEqual([]);
  });
});

describe("validate", () => {
  it("accepts a valid project", () => {
    expect(errorsFor({})).toBeUndefined();
  });

  it("requires every field when the form is empty", () => {
    const fields = validate({ value: defaultValues })?.fields;

    expect(Object.keys(fields ?? {}).sort()).toEqual([
      "contractors",
      "currencyCode",
      "field",
      "name",
      "operators",
      "rigName",
      "rigType",
    ]);
  });

  it.each(["name", "field", "rigName"] as const)("rejects a %s that is only whitespace", (key) => {
    expect(errorsFor({ [key]: "   " })?.[key]).toBeDefined();
  });

  it("accepts two operators", () => {
    expect(errorsFor({ operators: "NIOC, Total" })).toBeUndefined();
  });

  it("rejects three operators", () => {
    expect(errorsFor({ operators: "A, B, C" })?.operators).toBe(
      "Enter at most 2 names, separated by a comma",
    );
  });

  it("rejects contractors that are only commas", () => {
    expect(errorsFor({ contractors: " , " })?.contractors).toBe("Contractors is required");
  });

  it("rejects a name longer than 255 characters", () => {
    expect(errorsFor({ contractors: "x".repeat(256) })?.contractors).toBe(
      "Each name must be at most 255 characters",
    );
  });
});

describe("toPayload", () => {
  it("trims text and splits the name lists", () => {
    expect(
      toPayload({ ...validValues, name: "  Azadegan  ", operators: " NIOC , Total " }),
    ).toEqual({
      name: "Azadegan",
      field: "Azadegan",
      operators: ["NIOC", "Total"],
      contractors: ["NIDC"],
      rigName: "NDC-110",
      rigType: "onshore",
      currencyCode: "USD",
    });
  });
});

describe("toFormValues / toUpdatePayload", () => {
  const project: Project = {
    id: "0190f0b2-0000-7000-8000-000000000000",
    name: "Azadegan Phase 2",
    field: "Azadegan",
    operators: ["NIOC", "Total"],
    contractors: ["NIDC"],
    rigName: "NDC-110",
    rigType: "onshore",
    currencyCode: "USD",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("joins the name lists with a comma", () => {
    expect(toFormValues(project)).toEqual({
      ...validValues,
      operators: "NIOC, Total",
      contractors: "NIDC",
    });
  });

  it("round-trips a project through the form", () => {
    const payload = toUpdatePayload(toFormValues(project));

    expect(payload.operators).toEqual(project.operators);
    expect(payload.contractors).toEqual(project.contractors);
    expect(payload.name).toBe(project.name);
  });
});
