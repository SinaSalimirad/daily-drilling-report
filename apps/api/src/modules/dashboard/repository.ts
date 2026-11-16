import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  dailyReports,
  drillingSections,
  inventoryMoves,
  products,
  projectProducts,
  projects,
  wellMembers,
  wells,
} from '../../db/schema';

export const dashboardRepository = (db: Db) => ({
  /** Active wells of active projects; `memberId`: only those assigned to this user. */
  visibleWells(memberId?: string) {
    return db
      .select({
        id: wells.id,
        name: wells.name,
        projectId: projects.id,
        projectName: projects.name,
        currency: projects.currency,
        unitSystem: projects.unitSystem,
      })
      .from(wells)
      .innerJoin(projects, eq(projects.id, wells.projectId))
      .where(
        and(
          isNull(wells.archivedAt),
          isNull(projects.archivedAt),
          memberId
            ? inArray(
                wells.id,
                db
                  .select({ id: wellMembers.wellId })
                  .from(wellMembers)
                  .where(eq(wellMembers.userId, memberId)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(projects.name), asc(wells.name));
  },

  async sectionsOf(wellIds: string[]) {
    if (wellIds.length === 0) return [];
    return db
      .select({
        id: drillingSections.id,
        wellId: drillingSections.wellId,
        holeSize: drillingSections.holeSize,
        sortOrder: drillingSections.sortOrder,
      })
      .from(drillingSections)
      .where(inArray(drillingSections.wellId, wellIds))
      .orderBy(asc(drillingSections.sortOrder));
  },

  async productsOf(projectIds: string[]) {
    if (projectIds.length === 0) return [];
    return db
      .select({
        projectProductId: projectProducts.id,
        projectId: projectProducts.projectId,
        name: products.name,
        packageSize: products.packageSize,
        packageUnit: products.packageUnit,
        origin: projectProducts.origin,
      })
      .from(projectProducts)
      .innerJoin(products, eq(products.id, projectProducts.productId))
      .where(inArray(projectProducts.projectId, projectIds))
      .orderBy(asc(products.name));
  },

  /** Packages used and received per report and product (one move per report and product). */
  async usageOf(wellIds: string[], submittedOnly: boolean) {
    if (wellIds.length === 0) return [];
    const rows = await db
      .select({
        wellId: dailyReports.wellId,
        sectionId: dailyReports.sectionId,
        reportDate: dailyReports.reportDate,
        projectProductId: inventoryMoves.projectProductId,
        used: inventoryMoves.used,
        received: inventoryMoves.received,
      })
      .from(inventoryMoves)
      .innerJoin(dailyReports, eq(dailyReports.id, inventoryMoves.reportId))
      .where(
        and(
          inArray(dailyReports.wellId, wellIds),
          or(ne(inventoryMoves.used, '0'), ne(inventoryMoves.received, '0')),
          submittedOnly ? eq(dailyReports.status, 'submitted') : undefined,
        ),
      )
      .orderBy(asc(dailyReports.reportDate));
    // numeric comes back as a string (docs: convert at the repository boundary).
    return rows.map(({ used, received, ...row }) => ({
      ...row,
      used: Number(used),
      received: Number(received),
    }));
  },
});
