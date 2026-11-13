import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  CurrencyCode,
  type InsertProject,
  insertProjectSchema,
  projects,
  RigType,
} from "@/features/projects/projects.schema";
import {
  Designation,
  type InsertWell,
  insertWellSchema,
  WellType,
  wells,
} from "@/features/wells/wells.schema";

// Dummy data for local development. Safe to run many times: rows that already
// exist (same project name, or same well name inside a project) are skipped.
// Nothing is ever deleted.

type SeedWell = Omit<InsertWell, "projectId">;
type SeedProject = { project: InsertProject; wells: SeedWell[] };

const seedData: SeedProject[] = [
  {
    project: {
      name: "Azadegan Phase 2",
      operators: ["NIOC"],
      contractors: ["NIDC"],
      field: "Azadegan",
      rigName: "NDC-110",
      rigType: RigType.Onshore,
      currencyCode: CurrencyCode.Dollar,
    },
    wells: [
      {
        name: "AZN-101",
        designation: Designation.Exploration,
        spudDate: "2026-01-12",
        wellType: WellType.Vertical,
        rigName: "NDC-110",
        rigType: RigType.Onshore,
      },
      {
        name: "AZN-102",
        designation: Designation.NewLeg,
        spudDate: "2026-02-20",
        wellType: WellType.Directional,
        rigName: "NDC-110",
        rigType: RigType.Onshore,
      },
      {
        name: "AZN-103",
        designation: Designation.WorkOver,
        spudDate: "2026-04-05",
        wellType: WellType.Vertical,
        rigName: "NDC-110",
        rigType: RigType.Onshore,
      },
    ],
  },
  {
    project: {
      name: "South Pars Offshore",
      operators: ["Pars Oil and Gas", "Total"],
      contractors: ["ISOC"],
      field: "South Pars",
      rigName: "Iran Alborz",
      rigType: RigType.Offshore,
      currencyCode: CurrencyCode.Euro,
    },
    wells: [
      {
        name: "SPD-11A",
        designation: Designation.Exploration,
        spudDate: "2026-03-02",
        wellType: WellType.Directional,
        rigName: "Iran Alborz",
        rigType: RigType.Offshore,
        waterDepthM: 65.5,
      },
      {
        name: "SPD-11B",
        designation: Designation.ReEntry,
        spudDate: "2026-05-18",
        wellType: WellType.Directional,
        rigName: "Iran Alborz",
        rigType: RigType.Offshore,
        waterDepthM: 66,
      },
      {
        name: "SPD-12",
        designation: Designation.Plugging,
        spudDate: "2026-06-30",
        wellType: WellType.Vertical,
        rigName: "Iran Alborz",
        rigType: RigType.Offshore,
        waterDepthM: 72.25,
      },
      {
        name: "SPD-13",
        designation: Designation.Cuttings,
        spudDate: "2026-08-09",
        wellType: WellType.Vertical,
        rigName: "Iran Alborz",
        rigType: RigType.Offshore,
        waterDepthM: 70,
      },
    ],
  },
  {
    project: {
      name: "Ahvaz Redevelopment",
      operators: ["NISOC"],
      contractors: ["NDC", "Dana Drilling"],
      field: "Ahvaz",
      rigName: "NDC-33",
      rigType: RigType.Onshore,
      currencyCode: CurrencyCode.Rial,
    },
    wells: [
      {
        name: "AWZ-210",
        designation: Designation.Repairing,
        spudDate: "2025-11-03",
        wellType: WellType.Vertical,
        rigName: "NDC-33",
        rigType: RigType.Onshore,
      },
      {
        name: "AWZ-211",
        designation: Designation.Perforation,
        spudDate: "2025-12-14",
        wellType: WellType.Vertical,
        rigName: "NDC-33",
        rigType: RigType.Onshore,
      },
    ],
  },
  {
    project: {
      name: "Persian Gulf Wildcat",
      operators: ["Pars Oil and Gas"],
      contractors: ["ISOC"],
      field: "Golshan",
      rigName: "Iran Khazar",
      rigType: RigType.Offshore,
      currencyCode: CurrencyCode.Dollar,
    },
    wells: [],
  },
];

// Validate with the same schemas the API uses, so the seed can't drift from the rules.
async function seed() {
  let projectCount = 0;
  let wellCount = 0;

  for (const entry of seedData) {
    const input = insertProjectSchema.parse(entry.project);
    const inserted = await db.insert(projects).values(input).onConflictDoNothing().returning();
    projectCount += inserted.length;

    // On a re-run the project already exists, so look it up by its unique name.
    const [project] = await db.select().from(projects).where(eq(projects.name, input.name));
    if (!project) throw new Error(`Project "${input.name}" is missing after insert`);

    const rows = entry.wells.map((well) =>
      insertWellSchema.parse({ ...well, projectId: project.id }),
    );
    if (rows.length === 0) continue;

    const insertedWells = await db.insert(wells).values(rows).onConflictDoNothing().returning();
    wellCount += insertedWells.length;
  }

  console.log(`Seed done: ${projectCount} new project(s), ${wellCount} new well(s).`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
