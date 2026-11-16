import type { Well, WellCreate, WellListQuery, WellUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import type { projectsService } from '../projects/service';
import type { WellRow, wellsRepository } from './repository';

const toWell = (row: WellRow): Well => ({
  id: row.id,
  projectId: row.projectId,
  name: row.name,
  designation: row.designation,
  wellType: row.wellType,
  rigType: row.rigType,
  spudDate: row.spudDate,
  waterDepth: row.waterDepth,
  archivedAt: row.archivedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const wellsService = (
  repository: ReturnType<typeof wellsRepository>,
  projects: ReturnType<typeof projectsService>,
) => {
  const get = async (wellId: string): Promise<Well> => {
    const row = await repository.findById(wellId);
    if (!row) throw new NotFoundError('Well not found');
    return toWell(row);
  };

  return {
    get,

    /**
     * 404 when the project does not exist (checked through the projects service).
     * `memberId`: only the wells assigned to this user (engineer, client; docs/07 "Scope").
     */
    async listByProject(projectId: string, query: WellListQuery, memberId?: string) {
      await projects.get(projectId);
      const { rows, total } = await repository.listByProject(projectId, query, memberId);
      return {
        data: rows.map(toWell),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },

    /** A duplicate name inside the project is rejected by the unique constraint (409). */
    async create(projectId: string, input: WellCreate): Promise<Well> {
      await projects.get(projectId);
      return toWell(await repository.insert({ ...input, projectId }));
    },

    async update(wellId: string, input: WellUpdate): Promise<Well> {
      const row = await repository.update(wellId, input);
      if (!row) throw new NotFoundError('Well not found');
      return toWell(row);
    },

    /** Archive instead of delete (docs/03). Archiving twice keeps the first date. */
    async archive(wellId: string): Promise<Well> {
      const current = await get(wellId);
      if (current.archivedAt) return current;
      const row = await repository.update(wellId, { archivedAt: new Date() });
      if (!row) throw new NotFoundError('Well not found');
      return toWell(row);
    },
  };
};
