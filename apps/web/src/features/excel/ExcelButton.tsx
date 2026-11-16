'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { saveFile } from '@/lib/download';
import { toastError } from '@/lib/form-errors';
import type { Sheet } from './sheets';
import { writeWorkbook } from './write';

/** Builds an Excel file in the browser from the page's own data (`sheets`), and saves it. */
export function ExcelButton({
  fileName,
  sheets,
  disabled,
}: {
  fileName: string;
  sheets: () => Sheet[];
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      saveFile(await writeWorkbook(sheets()), fileName);
    } catch (error) {
      toastError(error, 'The Excel file could not be built');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" onClick={download} disabled={disabled || busy}>
      {busy ? 'Preparing Excel…' : 'Excel'}
    </Button>
  );
}
