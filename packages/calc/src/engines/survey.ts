// Directional survey (workbook `Incl`; analysis §6.8). The sheet cuts each interval into 30
// slices, interpolates the inclination linearly and multiplies by cos(ΔAzi / 30); this is
// the file's method, not minimum curvature.

export type Station = {
  /** Measured depth, m. */
  md: number;
  /** Inclination, degrees. */
  inc: number;
  /** Azimuth, degrees. */
  azi: number;
};

const SLICES = 30;
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** True vertical depth of each station, m (rounded to 2 decimals as the sheet shows it). */
export function tvdFromSurvey(stations: readonly Station[]): number[] {
  const tvd: number[] = [];
  let previous: Station = { md: 0, inc: 0, azi: stations[0]?.azi ?? 0 };
  let total = 0;
  stations.forEach((station, index) => {
    // WORKBOOK-QUIRK: the first interval is measured from MD 0 with inclination 0.
    const from = index === 0 ? previous : (stations[index - 1] as Station);
    const length = station.md > from.md ? (station.md - from.md) / SLICES : 0;
    const step = Math.abs(station.inc - from.inc) / SLICES;
    const azimuth = Math.cos(rad((station.azi - from.azi) / SLICES));
    let sum = 0;
    for (let k = 1; k <= SLICES; k++) {
      const inc =
        station.inc > from.inc
          ? from.inc + step * k
          : station.inc < from.inc
            ? from.inc - step * k
            : station.inc;
      sum += length * azimuth * Math.cos(rad(inc));
    }
    total += sum;
    tvd.push(round2(total));
    previous = station;
  });
  return tvd;
}

/** The station at or above a depth (nearest, no interpolation), as the sheet's approximate `VLOOKUP`. */
function stationAt(stations: readonly Station[], md: number): number {
  let found = -1;
  stations.forEach((station, index) => {
    if (station.md <= md) found = index;
  });
  return found;
}

/** TVD at a measured depth: the TVD of the nearest station at or above it. */
export function tvdAtDepth(stations: readonly Station[], md: number): number {
  const index = stationAt(stations, md);
  return index < 0 ? 0 : (tvdFromSurvey(stations)[index] ?? 0);
}

/** Inclination at a measured depth: that of the nearest station at or above it, degrees. */
export function inclinationAtDepth(stations: readonly Station[], md: number): number {
  const index = stationAt(stations, md);
  return index < 0 ? 0 : (stations[index]?.inc ?? 0);
}
