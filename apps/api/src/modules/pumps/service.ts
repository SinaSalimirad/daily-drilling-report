import { pumpOutputPerStrokeSI } from '@ddr/calc';
import type { Pump, PumpCreate, PumpUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import { PG_FOREIGN_KEY_VIOLATION, pgError } from '../../lib/pg';
import type { projectsService } from '../projects/service';
import type { PumpRow, pumpsRepository } from './repository';

/** Output per stroke is derived on every read, never stored (docs/01 "derive, do not store"). */
const toPump = (row: PumpRow): Pump => ({
  id: row.id,
  projectId: row.projectId,
  model: row.model,
  type: row.type,
  linerDiameter: row.linerDiameter,
  strokeLength: row.strokeLength,
  efficiency: row.efficiency,
  sortOrder: row.sortOrder,
  outputPerStroke: pumpOutputPerStrokeSI(row),
  archivedAt: row.archivedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const pumpsService = (
  repository: ReturnType<typeof pumpsRepository>,
  projects: ReturnType<typeof projectsService>,
) => {
  const get = async (pumpId: string): Promise<Pump> => {
    const row = await repository.findById(pumpId);
    if (!row) throw new NotFoundError('Pump not found');
    return toPump(row);
  };

  return {
    get,

    async listByProject(projectId: string, archived: boolean): Promise<Pump[]> {
      await projects.get(projectId);
      return (await repository.listByProject(projectId, archived)).map(toPump);
    },

    async create(projectId: string, input: PumpCreate): Promise<Pump> {
      await projects.get(projectId);
      const sortOrder = input.sortOrder ?? (await repository.nextSortOrder(projectId));
      return toPump(await repository.insert({ ...input, sortOrder, projectId }));
    },

    async update(pumpId: string, input: PumpUpdate): Promise<Pump> {
      const row = await repository.update(pumpId, input);
      if (!row) throw new NotFoundError('Pump not found');
      return toPump(row);
    },

    /** Deletes an unused pump; one that a pump reading refers to is archived instead (docs/03). */
    async remove(pumpId: string): Promise<{ deleted: true } | { deleted: false; pump: Pump }> {
      await get(pumpId);
      try {
        await repository.delete(pumpId);
        return { deleted: true };
      } catch (error) {
        if (pgError(error)?.code !== PG_FOREIGN_KEY_VIOLATION) throw error;
        const row = await repository.update(pumpId, { archivedAt: new Date() });
        if (!row) throw new NotFoundError('Pump not found');
        return { deleted: false, pump: toPump(row) };
      }
    },
  };
};
