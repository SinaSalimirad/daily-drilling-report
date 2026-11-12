import { PackageOpen } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ProductSheet } from "./product-sheet";

export function ProductEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpen />
        </EmptyMedia>

        <EmptyTitle>No products yet</EmptyTitle>

        <EmptyDescription>
          Your product list is empty. Add your first product to start tracking drilling fluid
          products.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <ProductSheet />
      </EmptyContent>
    </Empty>
  );
}
