import {
  annulusPressureLoss,
  bitHydraulics,
  bitPressureLoss,
  drillPipeLength,
  ecd,
  holeCleaning,
  inclinationAtDepth,
  pipePressureLoss,
  scaleToActual,
  systemHorsepower,
  tvdAtDepth,
} from '@ddr/calc';
import { fromSI, toSI } from '@ddr/calc/units';
import type { HoleSectionRecord, Hydraulics } from '@ddr/schemas';
import type { Warning } from '../../lib/response';
import type { bhaRunsService } from '../bha-runs/service';
import type { holeSectionsService } from '../hole-sections/service';
import type { reportsService } from '../reports/service';
import type { samplesService } from '../samples/service';
import type { surveyService } from '../survey/service';
import type { volumesService } from '../volumes/service';
import type { wellsService } from '../wells/service';

/** Default drill-solids specific gravity of the sheet (`Solid Ana!F6`). */
const DRILL_SOLIDS_SG = 2.5;
const FT_PER_M = 1 / 0.3048;

const psiToPa = (psi: number) => toSI(psi, 'psi');
/** ft/min → m/s through the ROP unit (ft/h). */
const velocitySI = (ftPerMin: number) => toSI(ftPerMin * 60, 'ft_h');

/** The hole around a depth: the last section that covers it (a liner wins over its casing). */
function holeAt(sections: HoleSectionRecord[], depth: number, td: number) {
  let found: { diameter: number; open: boolean } | null = null;
  sections.forEach((section, index) => {
    const top = section.type === 'open_hole' ? (sections[index - 1]?.bottom ?? 0) : section.top;
    const bottom = section.bottom === 0 ? Math.max(td, depth + 1) : section.bottom;
    if (depth >= top && depth < bottom) {
      found = { diameter: section.innerDiameter, open: section.type === 'open_hole' };
    }
  });
  return found as { diameter: number; open: boolean } | null;
}

export const hydraulicsService = (
  reports: ReturnType<typeof reportsService>,
  wells: ReturnType<typeof wellsService>,
  holeSections: ReturnType<typeof holeSectionsService>,
  bhaRuns: ReturnType<typeof bhaRunsService>,
  samples: ReturnType<typeof samplesService>,
  volumes: ReturnType<typeof volumesService>,
  survey: ReturnType<typeof surveyService>,
) => ({
  async get(reportId: string, mode: 'virtual' | 'actual'): Promise<Hydraulics> {
    const report = await reports.get(reportId);
    const sections = await holeSections.list(report.wellId);
    const run = report.bhaRunId ? await bhaRuns.get(report.bhaRunId) : null;
    const sampled = await samples.get(reportId);
    const stations = await survey.stations(report.wellId);
    const flowSI = (await volumes.get(reportId)).block.flowRate;

    const bit = report.bitDepth ?? 0;
    const td = report.td ?? bit;
    const latest = sampled.latest;
    const sample = latest ? sampled.samples.find((s) => s.seq === latest.seq) : undefined;
    const missing: string[] = [];
    if (bit <= 0) missing.push('Bit depth');
    if (!run || run.components.length < 3) {
      missing.push('A drill string run with at least three components');
    }
    if (!latest?.pipe || !latest.annulus || !sample?.mudWeight) {
      missing.push('A mud sample with mud weight and the dial readings R600, R300, R100, R3');
    }
    if (!flowSI || flowSI <= 0) missing.push('Pump readings (strokes per minute)');

    const empty: Hydraulics = {
      missing,
      mode,
      scale: 1,
      flowRate: flowSI,
      pipe: [],
      annulus: [],
      bit: null,
      totals: { pipe: 0, annulus: 0, bit: 0, tools: 0, total: 0, measured: report.spp },
      systemHorsepower: null,
      ecd: null,
    };
    if (
      missing.length > 0 ||
      !run ||
      !latest?.pipe ||
      !latest.annulus ||
      !sample?.mudWeight ||
      !flowSI
    ) {
      return empty;
    }

    const q = fromSI(flowSI, 'gpm');
    const rho = fromSI(sample.mudWeight, 'ppg');
    const others = run.components.slice(1).map((c) => c.length ?? 0);
    let cursor = 0;
    const components = run.components.map((component, index) => {
      const length = index === 0 ? drillPipeLength(bit, others) : (component.length ?? 0);
      const start = cursor;
      cursor += length;
      return { ...component, length, start, end: cursor };
    });

    // --- pipe ----------------------------------------------------------------------
    const pipe = components
      .filter((c) => c.length > 0 && c.innerDiameter > 0)
      .map((c) => ({
        name: c.name,
        component: c,
        ...pipePressureLoss({
          flowGpm: q,
          idIn: fromSI(c.innerDiameter, 'in'),
          lengthFt: c.length * FT_PER_M,
          densityPpg: rho,
          law: latest.pipe as { n: number; k: number },
        }),
      }));

    // --- annulus: every component, cut where the hole changes ------------------------
    const annulus = components
      .filter((c) => c.length > 0)
      .flatMap((component) => {
        const cuts = new Set<number>([component.start, component.end]);
        sections.forEach((section, index) => {
          const top =
            section.type === 'open_hole' ? (sections[index - 1]?.bottom ?? 0) : section.top;
          for (const depth of [top, section.bottom]) {
            if (depth > component.start && depth < component.end) cuts.add(depth);
          }
        });
        const points = [...cuts].sort((a, b) => a - b);
        return points.slice(1).flatMap((end, i) => {
          const start = points[i] as number;
          const hole = holeAt(sections, (start + end) / 2, td);
          const holeIn = fromSI(hole?.diameter ?? run.bitSize, 'in');
          const pipeIn = fromSI(component.outerDiameter, 'in');
          if (holeIn <= pipeIn) return [];
          const result = annulusPressureLoss({
            flowGpm: q,
            holeIn,
            pipeIn,
            lengthFt: (end - start) * FT_PER_M,
            densityPpg: rho,
            law: latest.annulus as { n: number; k: number },
          });
          return [
            {
              name: `${component.name} in ${hole?.open === false ? 'casing' : 'open hole'}`,
              start,
              end,
              holeIn,
              pipeIn,
              ...result,
            },
          ];
        });
      });

    // --- bit and tools ---------------------------------------------------------------
    const nozzles32 = run.nozzles.flatMap((n) =>
      Array.from({ length: n.quantity }, () => n.size32),
    );
    const tfaIn2 = run.tfa / 0.0254 ** 2;
    const bitType =
      /pdc|diamond/i.test(run.bitType ?? '') || nozzles32.length === 0 ? 'pdc' : 'roller_cone';
    const bitLoss = bitPressureLoss({
      type: bitType,
      flowGpm: q,
      densityPpg: rho,
      nozzles32,
      tfaIn2,
    });
    const bitFlow = bitHydraulics({
      flowGpm: q,
      densityPpg: rho,
      bitPressureLossPsi: bitLoss,
      bitSizeIn: fromSI(run.bitSize, 'in'),
      // A bit known only by its TFA: one nozzle of the equivalent size, in 32nds.
      nozzles32: nozzles32.length > 0 ? nozzles32 : [Math.sqrt(tfaIn2 / (Math.PI / 4)) * 32],
    });
    const toolLoss = run.toolPressureLoss ? fromSI(run.toolPressureLoss, 'psi') : 0;

    let pipeLoss = pipe.reduce((sum, p) => sum + p.pressureLoss, 0);
    let annulusLoss = annulus.reduce((sum, a) => sum + a.pressureLoss, 0);
    const measured = report.spp ? fromSI(report.spp, 'psi') : null;
    const scale =
      mode === 'actual' && measured
        ? scaleToActual({
            sppPsi: measured,
            bitLossPsi: bitLoss,
            toolLossPsi: toolLoss,
            pipeLossPsi: pipeLoss,
            annulusLossPsi: annulusLoss,
          })
        : 1;
    pipeLoss *= scale;
    annulusLoss *= scale;
    const total = pipeLoss + annulusLoss + bitLoss + toolLoss;

    const tvdM = report.tvd ?? (stations.length > 0 ? tvdAtDepth(stations, td) : td);
    const ropFtHr = report.rop ? fromSI(report.rop, 'ft_h') : null;
    const dcIn = report.particleDiameter ? fromSI(report.particleDiameter, 'in') : null;
    const tIn = report.particleThickness ? fromSI(report.particleThickness, 'in') : null;

    return {
      missing: [],
      mode,
      scale,
      flowRate: flowSI,
      pipe: pipe.map((p) => ({
        name: p.name,
        length: p.component.length,
        innerDiameter: p.component.innerDiameter,
        velocity: velocitySI(p.velocity),
        pressureLoss: psiToPa(p.pressureLoss * scale),
        reynolds: p.reynolds,
        regime: p.regime,
      })),
      annulus: annulus.map((a) => ({
        name: a.name,
        length: a.end - a.start,
        holeDiameter: toSI(a.holeIn, 'in'),
        pipeDiameter: toSI(a.pipeIn, 'in'),
        velocity: velocitySI(a.velocity),
        pressureLoss: psiToPa(a.pressureLoss * scale),
        reynolds: a.reynolds,
        regime: a.regime,
        cleaning:
          ropFtHr && dcIn && tIn
            ? (() => {
                const c = holeCleaning({
                  annularVelocity: a.velocity,
                  holeIn: a.holeIn,
                  cuttingDiameterIn: dcIn,
                  cuttingThicknessIn: tIn,
                  densityPpg: rho,
                  drillSolidsSg: DRILL_SOLIDS_SG,
                  na: (latest.annulus as { n: number }).n,
                  ka: (latest.annulus as { k: number }).k,
                  reynolds: a.reynolds,
                  ropFtHr,
                  flowGpm: q,
                  inclinationDeg: inclinationAtDepth(stations, (a.start + a.end) / 2),
                });
                return {
                  slipVelocity: velocitySI(c.slipVelocity),
                  transportEfficiency: c.transportEfficiency,
                  cuttingConcentration: Number.isFinite(c.cuttingConcentration)
                    ? c.cuttingConcentration
                    : null,
                  index: Number.isFinite(c.index) ? c.index : null,
                  verdict: c.verdict,
                };
              })()
            : null,
      })),
      bit: {
        pressureLoss: psiToPa(bitLoss),
        hhp: bitFlow.hhp,
        hsi: bitFlow.hsi,
        jetVelocity: toSI(bitFlow.jetVelocity * 3600, 'ft_h'),
        impactForce: bitFlow.impactForce,
      },
      totals: {
        pipe: psiToPa(pipeLoss),
        annulus: psiToPa(annulusLoss),
        bit: psiToPa(bitLoss),
        tools: psiToPa(toolLoss),
        total: psiToPa(total),
        measured: report.spp,
      },
      systemHorsepower: systemHorsepower(total, q),
      ecd: toSI(ecd(rho, annulusLoss, fromSI(tvdM, 'ft')), 'ppg'),
    };
  },

  /** `SURVEY_NOT_UPDATED`: a directional well whose survey stops above the report's TD. */
  async warnings(reportId: string): Promise<Warning[]> {
    const report = await reports.get(reportId);
    const well = await wells.get(report.wellId);
    if (well.wellType !== 'directional' || !report.td) return [];
    const stations = await survey.stations(report.wellId);
    const last = stations[stations.length - 1]?.md ?? 0;
    if (report.td <= last) return [];
    return [
      {
        code: 'SURVEY_NOT_UPDATED',
        message: 'The survey ends above the total depth of this report',
        details: { lastStation: last, td: report.td },
      },
    ];
  },
});
