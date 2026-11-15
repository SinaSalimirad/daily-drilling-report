// The number and date the API would give the next report (docs/03, New Report macro):
// previous + 1 and previous date + 1 day; the first report has number 1 and the spud date.

type Previous = { reportNo: number; reportDate: string } | null;

/** `YYYY-MM-DD` plus one calendar day, in UTC so no time zone can shift it. */
export function nextDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function proposeNext(latest: Previous, spudDate: string | null) {
  return {
    reportNo: latest ? latest.reportNo + 1 : 1,
    reportDate: latest ? nextDay(latest.reportDate) : (spudDate ?? ''),
  };
}
