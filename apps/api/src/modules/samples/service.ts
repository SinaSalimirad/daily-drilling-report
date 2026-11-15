import {
  brineDensityFromChlorides,
  naclWeightPercent,
  plasticViscosity,
  powerLawAnnulus,
  powerLawPipe,
  yieldPoint,
} from '@ddr/calc';
import { fromSI, toSI } from '@ddr/calc/units';
import type { MudSample, SamplesPut, SamplesResult } from '@ddr/schemas';
import { ValidationError } from '../../lib/errors';
import type { lookupsService } from '../lookups/service';
import type { reportsService } from '../reports/service';
import type { sectionsService } from '../sections/service';
import type { NewSampleRow, SampleRow, samplesRepository } from './repository';

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

/** Dial readings are degrees; PV and YP are derived in the workbook's units, returned in SI. */
function derive(row: SampleRow): MudSample {
  const {
    reportId: _report,
    createdAt: _c,
    updatedAt: _u,
    createdBy: _cb,
    updatedBy: _ub,
    ...fields
  } = row;
  const hasDial = row.r600 !== null && row.r300 !== null;
  return {
    ...fields,
    plasticViscosity: hasDial ? toSI(plasticViscosity(row.r600 ?? 0, row.r300 ?? 0), 'cp') : null,
    yieldPoint: hasDial ? toSI(yieldPoint(row.r600 ?? 0, row.r300 ?? 0), 'lbf_100ft2') : null,
  };
}

/** The latest sample is the last one that has any reading (workbook: the last filled column). */
const hasData = (row: SampleRow) =>
  [row.mudWeight, row.r600, row.r300, row.chlorides, row.apiFluidLoss, row.solids].some(
    (value) => value !== null,
  );

export const samplesService = (
  repository: ReturnType<typeof samplesRepository>,
  reports: ReturnType<typeof reportsService>,
  sections: ReturnType<typeof sectionsService>,
  lookups: ReturnType<typeof lookupsService>,
) => {
  const read = async (reportId: string): Promise<SamplesResult> => {
    const report = await reports.get(reportId);
    const section = await sections.get(report.sectionId);
    const rows = await repository.list(reportId);
    const samples = rows.map(derive);
    const latestRow = [...rows].reverse().find(hasData);
    const latest = latestRow
      ? {
          seq: latestRow.seq,
          pipe:
            latestRow.r600 !== null && latestRow.r300 !== null
              ? powerLawPipe(latestRow.r600, latestRow.r300)
              : null,
          annulus:
            latestRow.r100 !== null && latestRow.r3 !== null
              ? powerLawAnnulus(latestRow.r100, latestRow.r3)
              : null,
          brineDensity:
            latestRow.chlorides !== null
              ? brineDensityFromChlorides(fromSI(latestRow.chlorides, 'mg_l'))
              : null,
          naclPercent:
            latestRow.chlorides !== null
              ? naclWeightPercent(fromSI(latestRow.chlorides, 'mg_l'))
              : null,
        }
      : null;
    const actual = latestRow && derive(latestRow);
    return {
      samples,
      latest,
      plan: {
        planned: {
          mudWeight: section.planMudWeight,
          yieldPoint: section.planYieldPoint,
          fluidLoss: section.planFluidLoss,
        },
        actual: {
          mudWeight: orNull(latestRow?.mudWeight),
          yieldPoint: orNull(actual?.yieldPoint),
          fluidLoss: orNull(latestRow?.apiFluidLoss),
        },
      },
    };
  };

  return {
    get: read,

    /** Replaces the samples; the array order is the sample number. */
    async replace(reportId: string, input: SamplesPut): Promise<SamplesResult> {
      await reports.get(reportId);
      const sourceIds = [
        ...new Set(input.samples.flatMap((s) => (s.sampleSourceId ? [s.sampleSourceId] : []))),
      ];
      const unknown = new Set(await lookups.unknownSampleSourceIds(sourceIds));
      const issues = input.samples.flatMap((sample, index) =>
        sample.sampleSourceId && unknown.has(sample.sampleSourceId)
          ? [{ path: `body.samples.${index}.sampleSourceId`, message: 'Unknown sample source' }]
          : [],
      );
      if (issues.length > 0) throw new ValidationError(issues);
      const rows: NewSampleRow[] = input.samples.map((sample, index) => ({
        seq: index + 1,
        sampleSourceId: orNull(sample.sampleSourceId),
        sampleTime: orNull(sample.sampleTime),
        flowlineTemp: orNull(sample.flowlineTemp),
        depth: orNull(sample.depth),
        mudWeight: orNull(sample.mudWeight),
        mudTemp: orNull(sample.mudTemp),
        funnelViscosity: orNull(sample.funnelViscosity),
        rheologyTemp: orNull(sample.rheologyTemp),
        r600: orNull(sample.r600),
        r300: orNull(sample.r300),
        r200: orNull(sample.r200),
        r100: orNull(sample.r100),
        r6: orNull(sample.r6),
        r3: orNull(sample.r3),
        gel10s: orNull(sample.gel10s),
        gel10m: orNull(sample.gel10m),
        gel30m: orNull(sample.gel30m),
        apiFluidLoss: orNull(sample.apiFluidLoss),
        oil: orNull(sample.oil),
        water: orNull(sample.water),
        solids: orNull(sample.solids),
        sand: orNull(sample.sand),
        mbt: orNull(sample.mbt),
        chlorides: orNull(sample.chlorides),
        otherProperties: sample.otherProperties ?? {},
      }));
      await repository.replace(reportId, rows);
      return read(reportId);
    },
  };
};
