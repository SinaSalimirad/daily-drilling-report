import { describe, expect, test } from 'bun:test';
import { ENGINE_VERSION } from './index';

describe('ENGINE_VERSION', () => {
  test('is a SemVer string, so result snapshots can be compared', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
