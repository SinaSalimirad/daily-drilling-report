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
    });
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
