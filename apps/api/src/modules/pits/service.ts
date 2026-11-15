import type { Pit, PitCreate, PitUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import { isReferencedError } from '../../lib/pg';
import type { projectsService } from '../projects/service';
import type { PitRow, pitsRepository } from './repository';

const toPit = (row: PitRow): Pit => ({
  id: row.id,
  projectId: row.projectId,
  name: row.name,
  capacity: row.capacity,
  sortOrder: row.sortOrder,
  archivedAt: row.archivedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const pitsService = (
  repository: ReturnType<typeof pitsRepository>,
  projects: ReturnType<typeof projectsService>,
) => {
  const get = async (pitId: string): Promise<Pit> => {
    const row = await repository.findById(pitId);
    if (!row) throw new NotFoundError('Pit not found');
    return toPit(row);
  };

  return {
    get,

    async listByProject(projectId: string, archived: boolean): Promise<Pit[]> {
      await projects.get(projectId);
      return (await repository.listByProject(projectId, archived)).map(toPit);
    },

    /** A duplicate name inside the project is rejected by the unique constraint (409). */
    async create(projectId: string, input: PitCreate): Promise<Pit> {
      await projects.get(projectId);
      const sortOrder = input.sortOrder ?? (await repository.nextSortOrder(projectId));
      return toPit(await repository.insert({ ...input, sortOrder, projectId }));
    },

    async update(pitId: string, input: PitUpdate): Promise<Pit> {
      const row = await repository.update(pitId, input);
      if (!row) throw new NotFoundError('Pit not found');
      return toPit(row);
    },

    /**
     * Deletes an unused pit. A pit that a reading refers to is archived instead
     * (docs/03), and the archived pit is returned.
     */
    async remove(pitId: string): Promise<{ deleted: true } | { deleted: false; pit: Pit }> {
      await get(pitId);
      try {
        await repository.delete(pitId);
        return { deleted: true };
      } catch (error) {
        if (!isReferencedError(error)) throw error;
        const row = await repository.update(pitId, { archivedAt: new Date() });
        if (!row) throw new NotFoundError('Pit not found');
        return { deleted: false, pit: toPit(row) };
      }
    },
  };
};
