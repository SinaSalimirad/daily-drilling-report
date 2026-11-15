import type { Project, ProjectCreate, ProjectListQuery, ProjectUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import type { ProjectRow, projectsRepository } from './repository';

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  operator: row.operator,
  contractor: row.contractor,
  rigName: row.rigName,
  fieldCountry: row.fieldCountry,
  currency: row.currency,
  unitSystem: row.unitSystem,
  archivedAt: row.archivedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const projectsService = (repository: ReturnType<typeof projectsRepository>) => {
  const get = async (projectId: string): Promise<Project> => {
    const row = await repository.findById(projectId);
    if (!row) throw new NotFoundError('Project not found');
    return toProject(row);
  };

  return {
    get,

    async list(query: ProjectListQuery) {
      const { rows, total } = await repository.list(query);
      return {
        data: rows.map(toProject),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    },

    /** A duplicate name is rejected by the unique constraint (409 CONFLICT). */
    async create(input: ProjectCreate): Promise<Project> {
      return toProject(await repository.insert(input));
    },

    async update(projectId: string, input: ProjectUpdate): Promise<Project> {
      const row = await repository.update(projectId, input);
      if (!row) throw new NotFoundError('Project not found');
      return toProject(row);
    },

    /** Archive instead of delete (docs/03). Archiving twice keeps the first date. */
    async archive(projectId: string): Promise<Project> {
      const current = await get(projectId);
      if (current.archivedAt) return current;
      const row = await repository.update(projectId, { archivedAt: new Date() });
      if (!row) throw new NotFoundError('Project not found');
      return toProject(row);
    },
  };
};
