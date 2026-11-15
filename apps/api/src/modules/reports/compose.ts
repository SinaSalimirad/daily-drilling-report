import type { Db } from '../../db/client';
import { lookupsRepository } from '../lookups/repository';
import { lookupsService } from '../lookups/service';
import { pitReadingsRepository } from '../pit-readings/repository';
import { pitReadingsService } from '../pit-readings/service';
import { pitsRepository } from '../pits/repository';
import { pitsService } from '../pits/service';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { reportActivitiesRepository } from '../report-activities/repository';
import { reportActivitiesService } from '../report-activities/service';
import { sectionsRepository } from '../sections/repository';
import { sectionsService } from '../sections/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { reportsRepository } from './repository';
import { reportsService } from './service';

/**
 * Wires the services of one report. The reports service needs the other two (carry-over
 * of readings, warnings), and they read reports, so they are built around it lazily.
 */
export function composeReportServices(db: Db) {
  const projects = projectsService(projectsRepository(db));
  const wells = wellsService(wellsRepository(db), projects);
  const lookups = lookupsService(lookupsRepository(db));
  const reports = reportsService(
    reportsRepository(db),
    wells,
    sectionsService(sectionsRepository(db), wells),
    (report, previous) => pitReadings.carryOver(report, previous),
    (reportId) => activities.warnings(reportId),
  );
  const activities = reportActivitiesService(reportActivitiesRepository(db), reports, lookups);
  const pitReadings = pitReadingsService(
    pitReadingsRepository(db),
    reports,
    wells,
    pitsService(pitsRepository(db), projects),
    lookups,
  );
  return { reports, activities, pitReadings };
}
