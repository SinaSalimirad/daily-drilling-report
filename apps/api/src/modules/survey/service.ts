import { type Station, tvdFromSurvey } from '@ddr/calc';
import type { Survey, SurveyPut } from '@ddr/schemas';
import { BusinessRuleError } from '../../lib/errors';
import type { wellsService } from '../wells/service';
import type { surveyRepository } from './repository';

export const surveyService = (
  repository: ReturnType<typeof surveyRepository>,
  wells: ReturnType<typeof wellsService>,
) => {
  const read = async (wellId: string): Promise<Survey> => {
    await wells.get(wellId);
    const rows = await repository.list(wellId);
    const tvd = tvdFromSurvey(
      rows.map((row) => ({ md: row.measuredDepth, inc: row.inclination, azi: row.azimuth })),
    );
    return {
      stations: rows.map((row, index) => ({
        id: row.id,
        measuredDepth: row.measuredDepth,
        inclination: row.inclination,
        azimuth: row.azimuth,
        tvd: tvd[index] ?? 0,
      })),
    };
  };

  return {
    get: read,

    /** Stations as `Station`s, for the engines. */
    async stations(wellId: string): Promise<Station[]> {
      return (await repository.list(wellId)).map((row) => ({
        md: row.measuredDepth,
        inc: row.inclination,
        azi: row.azimuth,
      }));
    },

    /** Replaces the survey; every depth must be below the one before (`SURVEY_DEPTH_NOT_INCREASING`). */
    async replace(wellId: string, input: SurveyPut): Promise<Survey> {
      await wells.get(wellId);
      const index = input.stations.findIndex(
        (station, i) =>
          i > 0 && station.measuredDepth <= (input.stations[i - 1]?.measuredDepth ?? 0),
      );
      if (index > 0) {
        throw new BusinessRuleError(
          'SURVEY_DEPTH_NOT_INCREASING',
          'Each station must be deeper than the one before',
          { station: index + 1, measuredDepth: input.stations[index]?.measuredDepth },
        );
      }
      await repository.replace(wellId, input.stations);
      return read(wellId);
    },
  };
};
