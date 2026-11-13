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
import { useDeleteWell } from "../hooks/use-well";
import type { WellListItem } from "../type";

type Props = {
  well: WellListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WellDeleteDialog({ well, open, onOpenChange }: Props) {
  const { mutate: deleteWell, isPending } = useDeleteWell();

  const handleConfirm = () => {
    deleteWell(well.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle className="font-bold text-lg">Delete well?</DialogTitle>
          </div>

          <DialogDescription className="text-foreground text-sm">
            This will permanently delete <strong>{well.name}</strong>. This action cannot be undone.
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
            {isPending ? "Deleting..." : "Delete well"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
