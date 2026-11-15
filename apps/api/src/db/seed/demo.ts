import type { Db } from '../client';
import { runSeed } from './run';

// `bun run db:seed:demo` — the well of the analysed workbook (PYW-24ST1, report 1).
// Local and test only; also the fixture for integration tests (docs/09-testing-strategy.md).
// The data arrives with the master-data tables in v0.2.0 (#28).

export async function seedDemo(_db: Db): Promise<number> {
  return 0;
}

if (import.meta.main) await runSeed('demo', seedDemo);
