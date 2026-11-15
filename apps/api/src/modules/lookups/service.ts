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

  /** The given ids that are not (or no longer) an activity of the list. */
  async unknownActivityIds(ids: string[]): Promise<string[]> {
    const known = new Set(await repository.existingActivityIds(ids));
    return ids.filter((id) => !known.has(id));
  },

  /** The given ids that are not (or no longer) a fluid system of the list. */
  async unknownFluidSystemIds(ids: string[]): Promise<string[]> {
    const known = new Set(await repository.existingFluidSystemIds(ids));
    return ids.filter((id) => !known.has(id));
  },

  /** The given ids that are not (or no longer) a pit mud type of the list. */
  async unknownPitMudTypeIds(ids: string[]): Promise<string[]> {
    const known = new Set(await repository.existingPitMudTypeIds(ids));
    return ids.filter((id) => !known.has(id));
  },
});
