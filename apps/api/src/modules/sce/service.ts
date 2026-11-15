import type { SceUnit, SceUnitCreate, SceUnitUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import { isReferencedError } from '../../lib/pg';
import type { projectsService } from '../projects/service';
import type { SceUnitRow, sceUnitsRepository } from './repository';

const toSceUnit = (row: SceUnitRow): SceUnit => ({
  id: row.id,
  projectId: row.projectId,
  type: row.type,
  unitNumber: row.unitNumber,
  manufacturer: row.manufacturer,
  screenSize: row.screenSize,
  model: row.model,
  sortOrder: row.sortOrder,
  archivedAt: row.archivedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const sceUnitsService = (
  repository: ReturnType<typeof sceUnitsRepository>,
  projects: ReturnType<typeof projectsService>,
) => {
  const get = async (sceUnitId: string): Promise<SceUnit> => {
    const row = await repository.findById(sceUnitId);
    if (!row) throw new NotFoundError('Solids-control unit not found');
    return toSceUnit(row);
  };

  return {
    get,

    /** Stable order: position, then creation identity. */
    async listByProject(projectId: string, archived: boolean): Promise<SceUnit[]> {
      await projects.get(projectId);
      return (await repository.listByProject(projectId, archived)).map(toSceUnit);
    },

    async create(projectId: string, input: SceUnitCreate): Promise<SceUnit> {
      await projects.get(projectId);
      const sortOrder = input.sortOrder ?? (await repository.nextSortOrder(projectId));
      return toSceUnit(await repository.insert({ ...input, sortOrder, projectId }));
    },

    async update(sceUnitId: string, input: SceUnitUpdate): Promise<SceUnit> {
      const row = await repository.update(sceUnitId, input);
      if (!row) throw new NotFoundError('Solids-control unit not found');
      return toSceUnit(row);
    },

    /** Deletes an unused unit; one that a usage row refers to is archived instead (docs/03). */
    async remove(
      sceUnitId: string,
    ): Promise<{ deleted: true } | { deleted: false; sceUnit: SceUnit }> {
      await get(sceUnitId);
      try {
        await repository.delete(sceUnitId);
        return { deleted: true };
      } catch (error) {
        if (!isReferencedError(error)) throw error;
        const row = await repository.update(sceUnitId, { archivedAt: new Date() });
        if (!row) throw new NotFoundError('Solids-control unit not found');
        return { deleted: false, sceUnit: toSceUnit(row) };
      }
    },
  };
};
