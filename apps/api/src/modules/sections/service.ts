import type { Section, SectionCreate, SectionUpdate } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import type { wellsService } from '../wells/service';
import type { SectionRow, sectionsRepository } from './repository';

const toSection = (row: SectionRow): Section => ({
  id: row.id,
  wellId: row.wellId,
  holeSize: row.holeSize,
  fluidType: row.fluidType,
  fluidSystemId: row.fluidSystemId,
  planMudWeight: row.planMudWeight,
  planYieldPoint: row.planYieldPoint,
  planFluidLoss: row.planFluidLoss,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const sectionsService = (
  repository: ReturnType<typeof sectionsRepository>,
  wells: ReturnType<typeof wellsService>,
) => {
  const get = async (sectionId: string): Promise<Section> => {
    const row = await repository.findById(sectionId);
    if (!row) throw new NotFoundError('Section not found');
    return toSection(row);
  };

  return {
    get,

    /** Sections of a well in their order; 404 when the well does not exist. */
    async listByWell(wellId: string): Promise<Section[]> {
      await wells.get(wellId);
      return (await repository.listByWell(wellId)).map(toSection);
    },

    async create(wellId: string, input: SectionCreate): Promise<Section> {
      await wells.get(wellId);
      const sortOrder = input.sortOrder ?? (await repository.nextSortOrder(wellId));
      return toSection(await repository.insert({ ...input, sortOrder, wellId }));
    },

    async update(sectionId: string, input: SectionUpdate): Promise<Section> {
      const row = await repository.update(sectionId, input);
      if (!row) throw new NotFoundError('Section not found');
      return toSection(row);
    },

    /** A section with reports is refused by the foreign key: 409 IN_USE (docs/05). */
    async remove(sectionId: string): Promise<void> {
      await get(sectionId);
      await repository.delete(sectionId);
    },
  };
};
