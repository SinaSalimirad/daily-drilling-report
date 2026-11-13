import { Boxes } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InventorySheet } from "./inventory-sheet";

export function InventoryEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Boxes />
        </EmptyMedia>

        <EmptyTitle>No inventories yet</EmptyTitle>

        <EmptyDescription>
          No product stock recorded yet. Add the first inventory row of a report to track what was
          received and used.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <InventorySheet />
      </EmptyContent>
    </Empty>
  );
}
