import { FileText } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ReportSheet } from "./report-sheet";

export function ReportEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>

        <EmptyTitle>No reports yet</EmptyTitle>

        <EmptyDescription>
          No daily reports yet. Add the first report of a well to start tracking mud and depths.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <ReportSheet />
      </EmptyContent>
    </Empty>
  );
}
