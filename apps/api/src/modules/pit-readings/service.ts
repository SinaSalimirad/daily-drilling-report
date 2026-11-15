import type { PitReadings, PitReadingsPut, Report } from '@ddr/schemas';
import { BusinessRuleError, ValidationError } from '../../lib/errors';
import type { lookupsService } from '../lookups/service';
import type { pitsService } from '../pits/service';
import type { reportsService } from '../reports/service';
import type { wellsService } from '../wells/service';
import type { pitReadingsRepository } from './repository';

/** Water in SI (kg/m³); the accepted mud weight is 0.5–2.6 × this (workbook AE2:AE3). */
const WATER_DENSITY = 1000;
const MIN_MUD_WEIGHT = 0.5 * WATER_DENSITY;
const MAX_MUD_WEIGHT = 2.6 * WATER_DENSITY;

export const pitReadingsService = (
  repository: ReturnType<typeof pitReadingsRepository>,
  reports: ReturnType<typeof reportsService>,
  wells: ReturnType<typeof wellsService>,
  pits: ReturnType<typeof pitsService>,
  lookups: ReturnType<typeof lookupsService>,
) => {
  const read = async (reportId: string): Promise<PitReadings> => {
    const readings = await repository.list(reportId);
    const totals = { active: 0, reserve: 0, notMud: 0 };
    for (const reading of readings) {
      if (reading.pitType === 'active') totals.active += reading.volume;
      else if (reading.pitType === 'reserve') totals.reserve += reading.volume;
      else totals.notMud += reading.volume;
    }
    return { readings, totals };
  };

  return {
    async get(reportId: string): Promise<PitReadings> {
      await reports.get(reportId);
      return read(reportId);
    },

    /** Copies the readings of the previous report onto a new one (docs: carry-over). */
    async carryOver(report: Report, previous: Report | undefined): Promise<void> {
      if (previous) await repository.copy(previous.id, report.id);
    },

    /**
     * Replaces the readings. Every pit must belong to the project of the well, appear
     * once, hold at most its capacity, and carry a plausible mud weight.
     */
    async replace(reportId: string, input: PitReadingsPut): Promise<PitReadings> {
      const report = await reports.get(reportId);
      const well = await wells.get(report.wellId);

      const issues: { path: string; message: string }[] = [];
      const seen = new Set<string>();
      for (const [index, reading] of input.readings.entries()) {
        if (seen.has(reading.pitId)) {
          issues.push({ path: `body.readings.${index}.pitId`, message: 'Pit sent twice' });
        }
        seen.add(reading.pitId);
      }
      const mudTypeIds = [
        ...new Set(input.readings.flatMap((r) => (r.mudTypeId ? [r.mudTypeId] : []))),
      ];
      const unknownMudTypes = new Set(await lookups.unknownPitMudTypeIds(mudTypeIds));
      for (const [index, reading] of input.readings.entries()) {
        if (reading.mudTypeId && unknownMudTypes.has(reading.mudTypeId)) {
          issues.push({ path: `body.readings.${index}.mudTypeId`, message: 'Unknown mud type' });
        }
      }
      if (issues.length > 0) throw new ValidationError(issues);

      for (const [index, reading] of input.readings.entries()) {
        // 404 for a missing pit; a pit of another project is a validation error.
        const pit = await pits.get(reading.pitId).catch(() => undefined);
        if (!pit || pit.projectId !== well.projectId) {
          throw new ValidationError([
            { path: `body.readings.${index}.pitId`, message: 'Unknown pit of this project' },
          ]);
        }
        if (reading.volume > pit.capacity) {
          throw new BusinessRuleError(
            'PIT_VOLUME_OVER_CAPACITY',
            `Volume of ${pit.name} is above its capacity`,
            { pitId: pit.id, volume: reading.volume, capacity: pit.capacity },
          );
        }
        const weight = reading.mudWeight;
        if (weight != null && (weight < MIN_MUD_WEIGHT || weight > MAX_MUD_WEIGHT)) {
          throw new BusinessRuleError(
            'MUD_WEIGHT_OUT_OF_RANGE',
            `Mud weight of ${pit.name} is outside 0.5–2.6 × water density`,
            { pitId: pit.id, mudWeight: weight, min: MIN_MUD_WEIGHT, max: MAX_MUD_WEIGHT },
          );
        }
      }

      await repository.replace(
        reportId,
        input.readings.map((r) => ({
          pitId: r.pitId,
          pitType: r.pitType,
          volume: r.volume,
          mudWeight: r.mudWeight ?? null,
          mudTypeId: r.mudTypeId ?? null,
        })),
      );
      return read(reportId);
    },
  };
};
