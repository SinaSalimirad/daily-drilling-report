import { chemicalVolume, stockMass } from '@ddr/calc';
import type { Recap } from '@ddr/schemas';
import { NotFoundError } from '../../lib/errors';
import type { inventoryService } from '../inventory/service';
import type { volumesService } from '../volumes/service';
import type { wellsService } from '../wells/service';
import type { recapRepository } from './repository';

const LIQUID_UNITS = new Set(['gal', 'l', 'm3', 'bbl']);
const money = (value: number) => Math.round(value * 100) / 100;

export const recapService = (
  repository: ReturnType<typeof recapRepository>,
  wells: ReturnType<typeof wellsService>,
  inventory: ReturnType<typeof inventoryService>,
  volumes: ReturnType<typeof volumesService>,
) => ({
  async get(wellId: string, scope: 'section' | 'well', sectionId?: string): Promise<Recap> {
    await wells.get(wellId);
    const all = await repository.reportsOf(wellId);
    const last = all[all.length - 1];
    if (!last) throw new NotFoundError('The well has no reports yet');
    const section = scope === 'section' ? (sectionId ?? last.sectionId) : null;
    const covered = scope === 'section' ? all.filter((r) => r.sectionId === section) : all;
    const closing = covered[covered.length - 1];
    if (!closing) throw new NotFoundError('The section has no reports yet');

    const ids = covered.map((r) => r.id);
    const [usage, items, hours, result] = await Promise.all([
      inventory.usageOf(ids),
      inventory.get(closing.id),
      repository.hoursByActivity(ids),
      volumes.get(closing.id),
    ]);
    const accounting = scope === 'section' ? result.accounting.section : result.accounting.well;

    const total = usage.reduce((sum, row) => sum + row.cost, 0);
    const local = usage
      .filter(
        (row) =>
          items.rows.find((r) => r.projectProductId === row.projectProductId)?.origin === 'local',
      )
      .reduce((sum, row) => sum + row.cost, 0);
    const products = usage.flatMap((row) => {
      const item = items.rows.find((r) => r.projectProductId === row.projectProductId);
      if (!item) return [];
      const pkg = {
        unit: item.packageUnit,
        size: item.packageSize,
        specificGravity: item.specificGravity,
      };
      const built = accounting.built;
      const liquid = LIQUID_UNITS.has(item.packageUnit);
      const volume = chemicalVolume(pkg, row.used);
      const mass = stockMass(pkg, row.used);
      return [
        {
          projectProductId: row.projectProductId,
          name: item.name,
          packageSize: item.packageSize,
          packageUnit: item.packageUnit,
          origin: item.origin,
          used: row.used,
          unitPrice: row.used > 0 ? money(row.cost / row.used) : 0,
          cost: money(row.cost),
          costShare: total > 0 ? Math.round((row.cost / total) * 10000) / 100 : 0,
          concentration: !liquid && mass !== null && built > 0 ? mass / built : null,
          volumePercent: liquid && volume !== null && built > 0 ? (volume / built) * 100 : null,
        },
      ];
    });

    const rops = covered.map((r) => r.rop).filter((rop): rop is number => rop !== null && rop > 0);
    return {
      scope,
      sectionId: section,
      reports: {
        count: covered.length,
        first: covered[0]?.reportNo ?? null,
        last: closing.reportNo,
      },
      cost: { total: money(total), local: money(local) },
      products: products.sort((a, b) => b.cost - a.cost),
      accounting,
      operationHours: hours,
      averageRop: rops.length > 0 ? rops.reduce((sum, rop) => sum + rop, 0) / rops.length : null,
    };
  },
});
