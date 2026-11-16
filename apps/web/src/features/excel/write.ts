import type { Sheet } from './sheets';

// Turns the rows of `sheets.ts` into an .xlsx file with exceljs (v1.1.0, decided 2026-11-16).
// exceljs is loaded only when a file is built, so it stays out of the pages' bundles.

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function writeWorkbook(sheets: Sheet[]): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DMR Online';
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    });
    sheet.title.forEach((line, index) => {
      const row = ws.addRow([line]);
      row.font = index === 0 ? { bold: true, size: 13 } : { size: 10 };
    });
    for (const block of sheet.blocks) {
      ws.addRow([]);
      ws.addRow([block.title]).font = { bold: true };
      if (block.header) {
        const header = ws.addRow(block.header);
        header.font = { bold: true };
        header.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
          cell.border = { bottom: { style: 'thin' } };
        });
      }
      for (const cells of block.rows) ws.addRow(cells);
    }
    ws.columns.forEach((column, index) => {
      column.width = index === 0 ? 28 : 14;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_TYPE });
}
