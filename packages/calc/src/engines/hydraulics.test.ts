import { describe, expect, it } from 'bun:test';
import {
  annulusPressureLoss,
  bitHydraulics,
  bitPressureLoss,
  ecd,
  flowRegime,
  pipePressureLoss,
  scaleToActual,
  systemHorsepower,
} from './hydraulics';
import { powerLawPipe } from './rheology';

// The formulas of analysis §8.5 applied by hand; the workbook files have no complete
// hydraulics fixture yet (KI-007), so these are consistency checks, not workbook values.
const law = powerLawPipe(84, 48) as { n: number; k: number };

describe('pipePressureLoss', () => {
  const out = pipePressureLoss({ flowGpm: 400, idIn: 4.27, lengthFt: 2841, densityPpg: 10.4, law });
  it('velocity = 24.48 Q / ID²', () => {
    expect(out.velocity).toBeCloseTo((24.48 * 400) / 4.27 ** 2, 9);
  });
  it('Reynolds = 15.467 V ID ρ / μ and the loss follows from f', () => {
    expect(out.reynolds).toBeCloseTo((15.467 * out.velocity * 4.27 * 10.4) / out.viscosity, 9);
    expect(out.pressureLoss).toBeCloseTo(
      ((out.frictionFactor * out.velocity ** 2 * 10.4) / (92916 * 4.27)) * 2841,
      9,
    );
    expect(out.pressureLoss).toBeGreaterThan(0);
  });
  it('a longer pipe loses proportionally more', () => {
    const longer = pipePressureLoss({
      flowGpm: 400,
      idIn: 4.27,
      lengthFt: 5682,
      densityPpg: 10.4,
      law,
    });
    expect(longer.pressureLoss / out.pressureLoss).toBeCloseTo(2, 9);
  });
});

describe('annulusPressureLoss', () => {
  it('laminar flow uses f = 24 / Re', () => {
    const out = annulusPressureLoss({
      flowGpm: 150,
      holeIn: 8.625,
      pipeIn: 5,
      lengthFt: 1000,
      densityPpg: 10,
      law: { n: 0.7, k: 1.2 },
    });
    expect(out.regime).toBe('laminar');
    expect(out.frictionFactor).toBeCloseTo(24 / out.reynolds, 12);
  });
  it('turbulent flow uses the power-law friction factor', () => {
    const out = annulusPressureLoss({
      flowGpm: 900,
      holeIn: 8.625,
      pipeIn: 5,
      lengthFt: 1000,
      densityPpg: 10,
      law: { n: 0.9, k: 0.05 },
    });
    expect(out.regime).toBe('turbulent');
    const logN = Math.log10(0.9);
    expect(out.frictionFactor).toBeCloseTo(
      (logN + 3.93) / 50 / out.reynolds ** ((1.75 - logN) / 7),
      12,
    );
  });
});

describe('flowRegime', () => {
  it('laminar below 2100, transient up to 4100, turbulent above', () => {
    expect(flowRegime(2099)).toBe('laminar');
    expect(flowRegime(2100)).toBe('transient');
    expect(flowRegime(4100)).toBe('transient');
    expect(flowRegime(4101)).toBe('turbulent');
  });
});

describe('bit', () => {
  it('roller cone: 156 ρ Q² / (Σ dn²)²', () => {
    const loss = bitPressureLoss({
      type: 'roller_cone',
      flowGpm: 400,
      densityPpg: 10,
      nozzles32: [12, 12, 12],
      tfaIn2: 0,
    });
    expect(loss).toBeCloseTo((156 * 10 * 400 ** 2) / 432 ** 2, 9);
  });
  it('PDC: ρ Q² / (10858 TFA²)', () => {
    expect(
      bitPressureLoss({ type: 'pdc', flowGpm: 400, densityPpg: 10, nozzles32: [], tfaIn2: 0.5 }),
    ).toBeCloseTo((10 * 400 ** 2) / (10858 * 0.25), 9);
  });
  it('HHP over 1714 (decision v0.8.5), HSI, jet velocity and impact force', () => {
    const out = bitHydraulics({
      flowGpm: 400,
      densityPpg: 10,
      bitPressureLossPsi: 800,
      bitSizeIn: 8.375,
      nozzles32: [12, 12, 12],
    });
    expect(out.hhp).toBeCloseTo((400 * 800) / 1714, 9);
    expect(out.hsi).toBeCloseTo((1.27 * out.hhp) / 8.375 ** 2, 9);
    expect(out.jetVelocity).toBeCloseTo((417.2 * 400) / 432, 9);
    expect(out.impactForce).toBeCloseTo((out.jetVelocity * 400 * 10) / 1930, 9);
  });
});

describe('system', () => {
  it('system horsepower is ΔP × Q / 1714', () => {
    expect(systemHorsepower(2750, 394)).toBeCloseTo((2750 * 394) / 1714, 9);
  });
  it('ECD = MW + ΔP annulus / (0.052 TVD)', () => {
    expect(ecd(10, 100, 5000)).toBeCloseTo(10.3846, 4);
  });
  it('actual mode scales the frictional losses to the measured SPP', () => {
    const factor = scaleToActual({
      sppPsi: 2750,
      bitLossPsi: 800,
      toolLossPsi: 150,
      pipeLossPsi: 944,
      annulusLossPsi: 56,
    });
    expect(factor).toBeCloseTo(1.8, 9);
    expect(
      scaleToActual({
        sppPsi: 1,
        bitLossPsi: 0,
        toolLossPsi: 0,
        pipeLossPsi: 0,
        annulusLossPsi: 0,
      }),
    ).toBe(1);
  });
});
