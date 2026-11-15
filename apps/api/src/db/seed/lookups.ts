import type { Db } from '../client';
import { runSeed } from './run';

// `bun run db:seed:lookups` — activities, sample sources, mud types, section types.
// Runs in every environment and must be idempotent (insert … on conflict do nothing).
// The lookup tables arrive in v0.2.0 (#17); until then there is nothing to write.

export async function seedLookups(_db: Db): Promise<number> {
  return 0;
}

if (import.meta.main) await runSeed('lookups', seedLookups);
