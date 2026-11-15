import { describe, expect, it } from 'bun:test';
import { parseEnv } from './parse-env';

const valid = { DATABASE_URL: 'postgres://ddr:secret@localhost:5432/ddr' };

describe('parseEnv', () => {
  it('applies defaults when only DATABASE_URL is set', () => {
    expect(parseEnv(valid)).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3001,
      DATABASE_URL: valid.DATABASE_URL,
      LOG_LEVEL: 'info',
      BETTER_AUTH_SECRET: 'development-only-secret-do-not-use-in-production',
      APP_ORIGIN: 'http://localhost',
    });
  });

  it('refuses the development secret in production, and a short one anywhere', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow(/at least 32/);
    expect(
      parseEnv({ ...valid, NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(40) })
        .BETTER_AUTH_SECRET,
    ).toHaveLength(40);
  });

  it('names a missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow('DATABASE_URL: missing');
  });

  it('names every malformed variable', () => {
    const run = () =>
      parseEnv({ ...valid, API_PORT: 'abc', LOG_LEVEL: 'loud', DATABASE_URL: 'mysql://x/y' });
    expect(run).toThrow(/API_PORT/);
    expect(run).toThrow(/LOG_LEVEL/);
    expect(run).toThrow(/DATABASE_URL/);
  });
});
