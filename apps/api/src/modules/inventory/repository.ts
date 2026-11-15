import { and, eq, lt, lte, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports, inventoryMoves, products, projectProducts } from '../../db/schema';

export type MoveData = {
  projectProductId: string;
  received: number;
  used: number;
  unitPrice: number;
};

export type UsageTotals = {
  usedSection: number;
  usedMonthly: number;
  usedCumulative: number;
  costSection: number;
  costMonthly: number;
  costCumulative: number;
};

/** numeric columns arrive as strings; converted here, at the repository boundary. */
export const inventoryRepository = (db: Db) => ({
  async listMoves(reportId: string): Promise<MoveData[]> {
    const rows = await db
      .select()
      .from(inventoryMoves)
      .where(eq(inventoryMoves.reportId, reportId));
    return rows.map((row) => ({
      projectProductId: row.projectProductId,
      received: Number(row.received),
      used: Number(row.used),
      unitPrice: Number(row.unitPrice),
    }));
  },

  /** Used packages with their package data, for the chemical volume of the reports of a well. */
  async usedMovesUpTo(wellId: string, reportNo: number) {
    const rows = await db
      .select({
        reportId: inventoryMoves.reportId,
        used: inventoryMoves.used,
        packageSize: products.packageSize,
        packageUnit: products.packageUnit,
        specificGravity: products.specificGravity,
      })
      .from(inventoryMoves)
      .innerJoin(dailyReports, eq(dailyReports.id, inventoryMoves.reportId))
      .innerJoin(projectProducts, eq(projectProducts.id, inventoryMoves.projectProductId))
      .innerJoin(products, eq(products.id, projectProducts.productId))
      .where(and(eq(dailyReports.wellId, wellId), lte(dailyReports.reportNo, reportNo)));
    return rows.map((row) => ({ ...row, used: Number(row.used) }));
  },

  /** Net stock (received − used) per project product over the earlier reports of a well. */
  async stockBefore(wellId: string, reportNo: number): Promise<Map<string, number>> {
    const rows = await db
      .select({
        projectProductId: inventoryMoves.projectProductId,
        stock: sql<string>`sum(${inventoryMoves.received} - ${inventoryMoves.used})`,
      })
      .from(inventoryMoves)
      .innerJoin(dailyReports, eq(dailyReports.id, inventoryMoves.reportId))
      .where(and(eq(dailyReports.wellId, wellId), lt(dailyReports.reportNo, reportNo)))
      .groupBy(inventoryMoves.projectProductId);
    return new Map(rows.map((row) => [row.projectProductId, Number(row.stock)]));
  },

  /**
   * Usage and its cost per project product, over the reports of the well up to and
   * including `reportNo`: of the section, of the calendar month, and all.
   */
  async usageTotals(
    wellId: string,
    reportNo: number,
    sectionId: string,
    month: string,
  ): Promise<Map<string, UsageTotals>> {
    const inSection = sql`${dailyReports.sectionId} = ${sectionId}`;
    const inMonth = sql`to_char(${dailyReports.reportDate}, 'YYYY-MM') = ${month}`;
    const cost = sql`${inventoryMoves.used} * ${inventoryMoves.unitPrice}`;
    const rows = await db
      .select({
        projectProductId: inventoryMoves.projectProductId,
        usedSection: sql<string>`coalesce(sum(${inventoryMoves.used}) filter (where ${inSection}), 0)`,
        usedMonthly: sql<string>`coalesce(sum(${inventoryMoves.used}) filter (where ${inMonth}), 0)`,
        usedCumulative: sql<string>`coalesce(sum(${inventoryMoves.used}), 0)`,
        costSection: sql<string>`coalesce(sum(${cost}) filter (where ${inSection}), 0)`,
        costMonthly: sql<string>`coalesce(sum(${cost}) filter (where ${inMonth}), 0)`,
        costCumulative: sql<string>`coalesce(sum(${cost}), 0)`,
      })
      .from(inventoryMoves)
      .innerJoin(dailyReports, eq(dailyReports.id, inventoryMoves.reportId))
      .where(and(eq(dailyReports.wellId, wellId), lte(dailyReports.reportNo, reportNo)))
      .groupBy(inventoryMoves.projectProductId);
    return new Map(
      rows.map((row) => [
        row.projectProductId,
        {
          usedSection: Number(row.usedSection),
          usedMonthly: Number(row.usedMonthly),
          usedCumulative: Number(row.usedCumulative),
          costSection: Number(row.costSection),
          costMonthly: Number(row.costMonthly),
          costCumulative: Number(row.costCumulative),
        },
      ]),
    );
  },

  /** Deletes the moves of the report and writes the new ones, in one transaction. */
  async replaceMoves(reportId: string, moves: MoveData[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(inventoryMoves).where(eq(inventoryMoves.reportId, reportId));
      if (moves.length === 0) return;
      await tx.insert(inventoryMoves).values(
        moves.map((move) => ({
          reportId,
          projectProductId: move.projectProductId,
          received: String(move.received),
          used: String(move.used),
          unitPrice: move.unitPrice.toFixed(2),
        })),
      );
    });
  },
});
