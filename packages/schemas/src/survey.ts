import { z } from 'zod';
import { idSchema } from './base';

// Directional survey of a well (workbook `Incl`, up to 299 stations; analysis §6.8).
// Depth in metres; inclination and azimuth in degrees.

export const MAX_SURVEY_STATIONS = 299;

export const surveyStationInputSchema = z
  .object({
    measuredDepth: z.number().nonnegative(),
    inclination: z.number().min(0).max(180),
    azimuth: z.number().min(0).max(360),
  })
  .strict();

/** `PUT` replaces the whole survey; depths must increase from station to station. */
export const surveyPutSchema = z
  .object({ stations: z.array(surveyStationInputSchema).max(MAX_SURVEY_STATIONS) })
  .strict();
export type SurveyPut = z.infer<typeof surveyPutSchema>;

export const surveySchema = z.object({
  stations: z.array(
    z.object({
      id: idSchema,
      measuredDepth: z.number(),
      inclination: z.number(),
      azimuth: z.number(),
      /** True vertical depth by the `Incl` method, m (derived, never stored). */
      tvd: z.number(),
    }),
  ),
});
export type Survey = z.infer<typeof surveySchema>;
