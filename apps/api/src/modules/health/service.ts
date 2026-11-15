import { ServiceUnavailableError } from '../../lib/errors';
import type { healthRepository } from './repository';

export const healthService = (repository: ReturnType<typeof healthRepository>) => ({
  /** 200 only when the database answers (docs/11-environments-and-deployment.md). */
  async check() {
    try {
      await repository.ping();
    } catch (cause) {
      throw new ServiceUnavailableError('Database is not reachable', { cause });
    }
    return { status: 'ok' as const, database: 'up' as const };
  },
});
