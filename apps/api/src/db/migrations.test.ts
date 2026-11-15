import { describe, expect, it } from 'bun:test';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

// drizzle-kit writes `"public".` in front of enum types and foreign-key targets. That
// pins objects to `public`, so a migration applied to a per-file test schema (test/db.ts)
// would create types in, and point foreign keys at, the development data. Production
// is not affected (its search_path is public), but the tests would be wrong.
// Fix: delete `"public".` from the generated SQL before committing it.

const folder = path.join(import.meta.dirname, 'migrations');

describe('migrations', () => {
  it('do not hard-code the public schema', async () => {
    const files = (await readdir(folder)).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = await Bun.file(path.join(folder, file)).text();
      expect({ file, hasPublic: content.includes('"public".') }).toEqual({
        file,
        hasPublic: false,
      });
    }
  });
});
