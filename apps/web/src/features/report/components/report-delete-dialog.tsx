"use client";

import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteReport } from "../hooks/use-report";
import type { ReportListItem } from "../type";

type Props = {
  report: ReportListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportDeleteDialog({ report, open, onOpenChange }: Props) {
  const { mutate: deleteReport, isPending } = useDeleteReport();

  const handleConfirm = () => {
    deleteReport(report.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle className="font-bold text-lg">Delete report?</DialogTitle>
          </div>

          <DialogDescription className="text-foreground text-sm">
            This will permanently delete report <strong>#{report.reportNumber}</strong> of{" "}
            <strong>{report.wellName}</strong> ({report.date}). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" size="lg" autoFocus disabled={isPending} />}
          >
            Cancel
          </DialogClose>
          <Button variant="destructive" size="lg" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isPending ? "Deleting..." : "Delete report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
