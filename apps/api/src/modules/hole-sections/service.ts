import { averageHoleDiameterSI, totalHoleVolumeSI } from '@ddr/calc';
import {
  type Geometry,
  type HoleSectionCreate,
  type HoleSectionRecord,
  type HoleSectionUpdate,
  MAX_HOLE_SECTIONS,
} from '@ddr/schemas';
import { NotFoundError, ValidationError } from '../../lib/errors';
import type { wellsService } from '../wells/service';
import type { HoleSectionRow, holeSectionsRepository } from './repository';

const toRecord = (row: HoleSectionRow): HoleSectionRecord => ({
  id: row.id,
  wellId: row.wellId,
  type: row.type,
  top: row.top,
  bottom: row.bottom,
  outerDiameter: row.outerDiameter,
  innerDiameter: row.innerDiameter,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const holeSectionsService = (
  repository: ReturnType<typeof holeSectionsRepository>,
  wells: ReturnType<typeof wellsService>,
) => {
  const get = async (id: string): Promise<HoleSectionRecord> => {
    const row = await repository.findById(id);
    if (!row) throw new NotFoundError('Hole section not found');
    return toRecord(row);
  };

  const list = async (wellId: string): Promise<HoleSectionRecord[]> => {
    await wells.get(wellId);
    return (await repository.listByWell(wellId)).map(toRecord);
  };

  return {
    get,
    list,

    /** At most 10 rows, like the workbook's `WBG` (analysis §11). */
    async create(wellId: string, input: HoleSectionCreate): Promise<HoleSectionRecord> {
      await wells.get(wellId);
      if ((await repository.countByWell(wellId)) >= MAX_HOLE_SECTIONS) {
        throw new ValidationError([
          { path: 'body', message: `A well has at most ${MAX_HOLE_SECTIONS} hole sections` },
        ]);
      }
      const sortOrder = input.sortOrder ?? (await repository.nextSortOrder(wellId));
      return toRecord(await repository.insert({ ...input, sortOrder, wellId }));
    },

    async update(id: string, input: HoleSectionUpdate): Promise<HoleSectionRecord> {
      const row = await repository.update(id, input);
      if (!row) throw new NotFoundError('Hole section not found');
      return toRecord(row);
    },

    async remove(id: string): Promise<void> {
      await get(id);
      await repository.delete(id);
    },

    /** Total hole volume (m³) and average diameter (m) down to `td`, or to the deepest bottom. */
    async geometry(wellId: string, td?: number): Promise<Geometry> {
      const sections = await list(wellId);
      const depth = td ?? Math.max(0, ...sections.map((section) => section.bottom));
      return {
        td: depth,
        totalVolume: totalHoleVolumeSI(sections, depth),
        averageDiameter: averageHoleDiameterSI(sections, depth),
      };
    },
  };
};
