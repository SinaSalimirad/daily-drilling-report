import { and, eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { dailyReports, inventoryMoves } from '../../db/schema';

export type MoveData = {
  projectProductId: string;
  received: number;
  used: number;
  unitPrice: number;
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
