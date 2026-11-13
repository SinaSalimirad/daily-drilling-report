import type { ProductUnit } from "@/features/product/constants";
import type { ReportListItem } from "@/features/report/type";
import type { InventoryListItem } from "../type";
import type { ReportItem } from "./inventory-form-fields";

type ProductLike = { name: string; size: number; unit: ProductUnit };

// The same product name can exist in several sizes/units, so the size is part of the label.
export const productLabel = ({ name, size, unit }: ProductLike) => `${name} (${size} ${unit})`;

export const reportLabel = ({ reportNumber, date }: { reportNumber: number; date: string }) =>
  `#${reportNumber} · ${date}`;

export const toReportItems = (reports: ReadonlyArray<ReportListItem>): ReportItem[] =>
  reports.map((report) => ({
    value: report.id,
    label: reportLabel(report),
    wellId: report.wellId,
  }));

/** In the edit form a row keeps its well, report and product, so each select has one choice. */
export function lockedItems(inventory: InventoryListItem) {
  return {
    wellItems: [{ value: inventory.wellId, label: inventory.wellName }],
    reportItems: [
      {
        value: inventory.reportId,
        label: reportLabel({ reportNumber: inventory.reportNumber, date: inventory.reportDate }),
        wellId: inventory.wellId,
      },
    ],
    productItems: [
      {
        value: inventory.productId,
        label: productLabel({
          name: inventory.productName,
          size: inventory.productSize,
          unit: inventory.productUnit,
        }),
      },
    ],
  };
}
