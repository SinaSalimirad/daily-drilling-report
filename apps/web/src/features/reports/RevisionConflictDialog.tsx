'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** REVISION_MISMATCH (docs/05): someone saved the report first; reload to see their version. */
export function RevisionConflictDialog({
  open,
  onReload,
}: {
  open: boolean;
  onReload: () => void;
}) {
  return (
    // Only the reload button closes it: the unsaved edits cannot be saved over the newer version.
    <Dialog open={open} modal>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>This report was changed by someone else</DialogTitle>
          <DialogDescription>
            Your edits were not saved. Reload to see the latest version, then make your changes
            again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onReload}>
            Reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
