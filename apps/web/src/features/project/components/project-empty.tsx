import { FolderOpen } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ProjectSheet } from "./project-sheet";

export function ProjectEmpty() {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>

        <EmptyTitle>No projects yet</EmptyTitle>

        <EmptyDescription>
          Your project list is empty. Add your first project to start organizing wells and reports.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <ProjectSheet />
      </EmptyContent>
    </Empty>
  );
}
