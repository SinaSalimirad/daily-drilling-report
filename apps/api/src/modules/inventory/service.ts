import { costOf, finalStock } from '@ddr/calc';
import type { Inventory, InventoryPut, InventoryRow, ProjectProduct } from '@ddr/schemas';
import { ValidationError } from '../../lib/errors';
import type { Warning } from '../../lib/response';
import type { productsService } from '../products/service';
import type { reportsService } from '../reports/service';
import type { wellsService } from '../wells/service';
import type { inventoryRepository, MoveData, UsageTotals } from './repository';

// Three decimals are stored for quantities (numeric(14,3)); sums can carry binary noise.
const clean = (value: number) => Math.round(value * 1000) / 1000;
const money = (value: number) => Math.round(value * 100) / 100;

export const inventoryService = (
  repository: ReturnType<typeof inventoryRepository>,
  reports: ReturnType<typeof reportsService>,
  wells: ReturnType<typeof wellsService>,
  products: ReturnType<typeof productsService>,
) => {
  /** Project and price list of the report's well. */
  const context = async (reportId: string) => {
    const report = await reports.get(reportId);
    const well = await wells.get(report.wellId);
    const priceList = await products.listForProject(well.projectId);
    return { report, priceList };
  };

  const rowOf = (
    item: ProjectProduct,
    move: MoveData | undefined,
    initial: number,
    totals: UsageTotals | undefined,
  ): InventoryRow => {
    const received = move?.received ?? 0;
    const used = move?.used ?? 0;
    const unitPrice = move?.unitPrice ?? item.unitPrice;
    return {
      projectProductId: item.id,
      productId: item.product.id,
      name: item.product.name,
      packageSize: item.product.packageSize,
      packageUnit: item.product.packageUnit,
      origin: item.origin,
      unitPrice,
      initial: clean(initial),
      received,
      used,
      finalStock: clean(finalStock({ initial, received, used })),
      dailyCost: money(costOf(used, unitPrice)),
      usedSection: clean(totals?.usedSection ?? 0),
      usedMonthly: clean(totals?.usedMonthly ?? 0),
      usedCumulative: clean(totals?.usedCumulative ?? 0),
      keyStock: item.keyStock,
    };
  };

  const read = async (reportId: string): Promise<Inventory> => {
    const { report, priceList } = await context(reportId);
    const [moves, stock, totals] = await Promise.all([
      repository.listMoves(reportId),
      repository.stockBefore(report.wellId, report.reportNo),
      repository.usageTotals(
        report.wellId,
        report.reportNo,
        report.sectionId,
        report.reportDate.slice(0, 7),
      ),
    ]);
    const priceOf = new Map(priceList.map((item) => [item.id, item.unitPrice]));
    const byProduct = new Map(moves.map((move) => [move.projectProductId, move]));
    // Active products, and inactive ones that still have stock or a move on this report.
    const rows = priceList
      .filter((item) => item.active || byProduct.has(item.id) || (stock.get(item.id) ?? 0) !== 0)
      .map((item) =>
        rowOf(item, byProduct.get(item.id), stock.get(item.id) ?? 0, totals.get(item.id)),
      );

    // Cost of the usage; "local" is the part from products of local origin (`Q7` radio).
    const costs = {
      daily: { total: 0, local: 0 },
      section: { total: 0, local: 0 },
      monthly: { total: 0, local: 0 },
      cumulative: { total: 0, local: 0 },
    };
    for (const row of rows) {
      const t = totals.get(row.projectProductId);
      const parts = [
        ['daily', row.dailyCost],
        ['section', t?.costSection ?? 0],
        ['monthly', t?.costMonthly ?? 0],
        ['cumulative', t?.costCumulative ?? 0],
      ] as const;
      for (const [key, value] of parts) {
        costs[key].total += value;
        if (row.origin === 'local') costs[key].local += value;
      }
    }
    for (const part of Object.values(costs)) {
      part.total = money(part.total);
      part.local = money(part.local);
    }
    const stockValue = money(
      rows.reduce((sum, row) => sum + row.finalStock * (priceOf.get(row.projectProductId) ?? 0), 0),
    );
    return { rows, costs, stockValue };
  };

  return {
    get: read,

    /** `NEGATIVE_STOCK`: the workbook's "Final stock is not valid", as a warning (docs/05). */
    async warnings(reportId: string): Promise<Warning[]> {
      const { rows } = await read(reportId);
      const negative = rows.filter((row) => row.finalStock < 0);
      if (negative.length === 0) return [];
      return [
        {
          code: 'NEGATIVE_STOCK',
          message: `Final stock is negative: ${negative.map((row) => row.name).join(', ')}`,
          details: {
            products: negative.map((row) => ({
              projectProductId: row.projectProductId,
              name: row.name,
              finalStock: row.finalStock,
            })),
          },
        },
      ];
    },

    /**
     * Replaces the moves of the report. A product that already had a move today keeps
     * the price copied then; a new move copies the current price of the price list.
     */
    async replace(reportId: string, input: InventoryPut): Promise<Inventory> {
      const { priceList } = await context(reportId);
      const items = new Map(priceList.map((item) => [item.id, item]));
      const issues: { path: string; message: string }[] = [];
      const seen = new Set<string>();
      for (const [index, move] of input.moves.entries()) {
        if (!items.has(move.projectProductId)) {
          issues.push({
            path: `body.moves.${index}.projectProductId`,
            message: 'Unknown product of this project',
          });
        } else if (seen.has(move.projectProductId)) {
          issues.push({
            path: `body.moves.${index}.projectProductId`,
            message: 'Product sent twice',
          });
        }
        seen.add(move.projectProductId);
      }
      if (issues.length > 0) throw new ValidationError(issues);

      const existing = new Map(
        (await repository.listMoves(reportId)).map((move) => [move.projectProductId, move]),
      );
      const moves: MoveData[] = input.moves
        .filter((move) => move.received !== 0 || move.used !== 0)
        .map((move) => ({
          ...move,
          unitPrice:
            existing.get(move.projectProductId)?.unitPrice ??
            (items.get(move.projectProductId)?.unitPrice as number),
        }));
      await repository.replaceMoves(reportId, moves);
      return read(reportId);
    },
  };
};
