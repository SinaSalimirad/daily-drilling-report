import { Layers } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SectionSheet } from "./section-sheet";

export function SectionEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Layers />
        </EmptyMedia>

        <EmptyTitle>No sections yet</EmptyTitle>

        <EmptyDescription>
          Your section list is empty. Add the hole sections of a well to start writing reports.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <SectionSheet />
      </EmptyContent>
    </Empty>
  );
}
