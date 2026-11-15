import type { lookupsRepository } from './repository';

export const lookupsService = (repository: ReturnType<typeof lookupsRepository>) => ({
  /** Every open list, unarchived rows in workbook order. */
  async all() {
    const [activities, sampleSources, fluidSystems, pitMudTypes] = await Promise.all([
      repository.activities(),
      repository.sampleSources(),
      repository.fluidSystems(),
      repository.pitMudTypes(),
    ]);
    return { activities, sampleSources, fluidSystems, pitMudTypes };
  },
});
