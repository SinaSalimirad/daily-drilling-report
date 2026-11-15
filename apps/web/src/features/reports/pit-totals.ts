/** Totals per pit type (workbook U23:U25), from the volumes typed so far. */
export function totalsOf(rows: { pitType: string; volume: number | null }[]) {
  const totals = { active: 0, reserve: 0, not_mud: 0 };
  for (const row of rows) {
    if (row.volume === null) continue;
    if (row.pitType === 'active' || row.pitType === 'reserve' || row.pitType === 'not_mud') {
      totals[row.pitType] += row.volume;
    }
  }
  return totals;
}
