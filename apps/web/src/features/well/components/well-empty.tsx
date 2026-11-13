import { FolderOpen } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { WellSheet } from "./well-sheet";

export function WellEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>

        <EmptyTitle>No wells yet</EmptyTitle>

        <EmptyDescription>
          Your well list is empty. Add your first well to start organizing sections and reports.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <WellSheet />
      </EmptyContent>
    </Empty>
  );
}
