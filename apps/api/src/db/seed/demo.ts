import { toSI, UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { pits, products, projects, pumps, sceUnits, wells } from '../schema';
import {
  DEMO_PITS_BBL,
  DEMO_PRODUCTS,
  DEMO_PROJECT,
  DEMO_PUMPS,
  DEMO_SCE_UNITS,
  DEMO_WELL,
} from './demo-data';
import { runSeed } from './run';

// `bun run db:seed:demo` — the analysed workbook's master data (report 1, PYW-24ST1).
// Local and test only; also the fixture for integration tests (docs/09).
// Idempotent: products, the project, the well and pits are matched by name; pumps and
// solids-control units have no natural key, so they are added only when the project has none.
// Values are converted from the workbook's units to SI here, never stored otherwise.

export async function seedDemo(db: Db): Promise<number> {
  let written = 0;

  for (const product of DEMO_PRODUCTS) {
    await db
      .insert(products)
      .values(product)
      .onConflictDoUpdate({
        target: products.name,
        set: {
          packageSize: product.packageSize,
          packageUnit: product.packageUnit,
          specificGravity: product.specificGravity,
          updatedAt: sql`now()`,
        },
      });
    written++;
  }

  const [project] = await db
    .insert(projects)
    .values({ ...DEMO_PROJECT, unitSystem: UNIT_SYSTEM_PRESETS.workbook })
    .onConflictDoUpdate({
      target: projects.name,
      set: { ...DEMO_PROJECT, unitSystem: UNIT_SYSTEM_PRESETS.workbook, updatedAt: sql`now()` },
    })
    .returning({ id: projects.id });
  if (!project) throw new Error('demo project was not written');
  const projectId = project.id;
  written++;

  await db
    .insert(wells)
    .values({ ...DEMO_WELL, projectId })
    .onConflictDoUpdate({
      target: [wells.projectId, wells.name],
      set: { ...DEMO_WELL, updatedAt: sql`now()` },
    });
  written++;

  for (const [index, [name, capacityBbl]] of DEMO_PITS_BBL.entries()) {
    const values = { name, capacity: toSI(capacityBbl, 'bbl'), sortOrder: index + 1 };
    await db
      .insert(pits)
      .values({ ...values, projectId })
      .onConflictDoUpdate({
        target: [pits.projectId, pits.name],
        set: { ...values, updatedAt: sql`now()` },
      });
    written++;
  }

  const has = async (table: typeof pumps | typeof sceUnits) =>
    ((await db.select({ n: count() }).from(table).where(eq(table.projectId, projectId)))[0]?.n ??
      0) > 0;

  if (!(await has(pumps))) {
    await db.insert(pumps).values(
      DEMO_PUMPS.map((p, index) => ({
        projectId,
        model: p.model,
        type: p.type,
        linerDiameter: toSI(p.linerIn, 'in'),
        strokeLength: toSI(p.strokeIn, 'in'),
        efficiency: p.efficiencyPct,
        sortOrder: index + 1,
      })),
    );
    written += DEMO_PUMPS.length;
  }

  if (!(await has(sceUnits))) {
    await db
      .insert(sceUnits)
      .values(DEMO_SCE_UNITS.map((u, index) => ({ ...u, projectId, sortOrder: index + 1 })));
    written += DEMO_SCE_UNITS.length;
  }

  return written;
}

/** Id of the demo project, for tests that build on the seed. */
export async function demoProjectId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.name, DEMO_PROJECT.name)));
  if (!row) throw new Error('run seedDemo first');
  return row.id;
}

if (import.meta.main) await runSeed('demo', seedDemo);
