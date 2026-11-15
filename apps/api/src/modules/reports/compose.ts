import type { Db } from '../../db/client';
import { bhaRunsRepository } from '../bha-runs/repository';
import { bhaRunsService } from '../bha-runs/service';
import { holeSectionsRepository } from '../hole-sections/repository';
import { holeSectionsService } from '../hole-sections/service';
import { inventoryRepository } from '../inventory/repository';
import { inventoryService } from '../inventory/service';
import { lookupsRepository } from '../lookups/repository';
import { lookupsService } from '../lookups/service';
import { pitReadingsRepository } from '../pit-readings/repository';
import { pitReadingsService } from '../pit-readings/service';
import { pitsRepository } from '../pits/repository';
import { pitsService } from '../pits/service';
import { productsRepository } from '../products/repository';
import { productsService } from '../products/service';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { pumpsRepository } from '../pumps/repository';
import { pumpsService } from '../pumps/service';
import { reportActivitiesRepository } from '../report-activities/repository';
import { reportActivitiesService } from '../report-activities/service';
import { samplesRepository } from '../samples/repository';
import { samplesService } from '../samples/service';
import { sectionsRepository } from '../sections/repository';
import { sectionsService } from '../sections/service';
import { volumesRepository } from '../volumes/repository';
import { volumesService } from '../volumes/service';
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
  const bhaRuns = bhaRunsService(bhaRunsRepository(db), wells);
  const reports = reportsService(
    reportsRepository(db),
    wells,
    sectionsService(sectionsRepository(db), wells, lookups),
    (report, previous) => pitReadings.carryOver(report, previous),
    async (reportId) => [
      ...(await activities.warnings(reportId)),
      ...(await inventory.warnings(reportId)),
      ...(await volumes.warnings(reportId)),
    ],
    bhaRuns,
  );
  const activities = reportActivitiesService(reportActivitiesRepository(db), reports, lookups);
  const pitReadings = pitReadingsService(
    pitReadingsRepository(db),
    reports,
    wells,
    pitsService(pitsRepository(db), projects),
    lookups,
  );
  const inventory = inventoryService(
    inventoryRepository(db),
    reports,
    wells,
    productsService(productsRepository(db), projects),
  );
  const volumes = volumesService(
    volumesRepository(db),
    reports,
    wells,
    holeSectionsService(holeSectionsRepository(db), wells),
    bhaRuns,
    pumpsService(pumpsRepository(db), projects),
    pitReadings,
    inventory,
  );
  const samples = samplesService(
    samplesRepository(db),
    reports,
    sectionsService(sectionsRepository(db), wells, lookups),
    lookups,
  );
  return { reports, activities, pitReadings, inventory, volumes, samples };
}
