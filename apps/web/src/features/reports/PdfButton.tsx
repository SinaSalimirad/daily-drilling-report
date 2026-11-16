'use client';

import type { PdfPage } from '@ddr/schemas';
import { Button } from '@/components/ui/button';
import { saveFile } from '@/lib/download';
import { toastError } from '@/lib/form-errors';
import { useReportPdf } from './use-reports';

/** Downloads the PDF of a print page; the server prints the same page the user sees. */
export function PdfButton({ reportId, page }: { reportId: string; page: PdfPage }) {
  const pdf = useReportPdf(reportId);
  const download = async () => {
    try {
      const file = await pdf.mutateAsync(page);
      saveFile(file, file.name);
    } catch (error) {
      toastError(error);
    }
  };
  return (
    <Button variant="outline" onClick={download} disabled={pdf.isPending}>
      {pdf.isPending ? 'Preparing PDF…' : 'PDF'}
    </Button>
  );
}
