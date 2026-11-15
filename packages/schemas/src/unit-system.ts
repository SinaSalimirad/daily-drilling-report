import { z } from 'zod';
import { QUANTITY_UNITS as U, type UnitSystem } from './units';

/** A project's display unit system (`projects.unit_system`): one allowed unit per quantity. */
export const unitSystemSchema = z
  .object({
    depth: z.enum(U.depth),
    diameter: z.enum(U.diameter),
    cakeThickness: z.enum(U.cakeThickness),
    volume: z.enum(U.volume),
    density: z.enum(U.density),
    pressure: z.enum(U.pressure),
    yieldStress: z.enum(U.yieldStress),
    flowRate: z.enum(U.flowRate),
    plasticViscosity: z.enum(U.plasticViscosity),
    concentration: z.enum(U.concentration),
    chlorides: z.enum(U.chlorides),
    mass: z.enum(U.mass),
    rop: z.enum(U.rop),
    temperature: z.enum(U.temperature),
  })
  .strict();

// A quantity added to QUANTITY_UNITS without a field here is a type error.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _sameShape: Exact<z.infer<typeof unitSystemSchema>, UnitSystem> = true;
void _sameShape;
