import { needsToolPressureLoss, totalFlowArea } from '@ddr/calc';
import { fromSI } from '@ddr/calc/units';
import type { BhaRun, BhaRunInput } from '@ddr/schemas';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../lib/errors';
import type { wellsService } from '../wells/service';
import type { bhaRunsRepository, RunFull, RunWrite } from './repository';

/** 1 in² = 0.00064516 m². */
const M2_PER_IN2 = 0.0254 ** 2;

const toRun = (row: RunFull): BhaRun => {
  const tfaIn2 = totalFlowArea(
    row.nozzles.map((n) => ({ size32: n.size32, quantity: n.quantity })),
    row.knownTfa === null ? null : row.knownTfa / M2_PER_IN2,
  );
  return {
    id: row.id,
    wellId: row.wellId,
    runNo: row.runNo,
    bitType: row.bitType,
    bitSize: row.bitSize,
    manufacturer: row.manufacturer,
    knownTfa: row.knownTfa,
    toolPressureLoss: row.toolPressureLoss,
    tfa: tfaIn2 * M2_PER_IN2,
    nozzles: row.nozzles.map((n) => ({ size32: n.size32, quantity: n.quantity })),
    components: row.components.map((c) => ({
      id: c.id,
      sortOrder: c.sortOrder,
      name: c.name,
      length: c.length,
      outerDiameter: c.outerDiameter,
      innerDiameter: c.innerDiameter,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const bhaRunsService = (
  repository: ReturnType<typeof bhaRunsRepository>,
  wells: ReturnType<typeof wellsService>,
) => {
  const get = async (id: string): Promise<BhaRun> => {
    const row = await repository.findById(id);
    if (!row) throw new NotFoundError('BHA run not found');
    return toRun(row);
  };

  /** Components after the first need a length; a motor or tool needs its pressure loss. */
  const check = (input: BhaRunInput) => {
    const issues = input.components.flatMap((component, index) =>
      index > 0 && component.length === null
        ? [{ path: `body.components.${index}.length`, message: 'Length is required' }]
        : [],
    );
    if (issues.length > 0) throw new ValidationError(issues);
    const bitIn = fromSI(input.bitSize, 'in');
    const tool = input.components.find((component) =>
      needsToolPressureLoss(
        { name: component.name, odIn: fromSI(component.outerDiameter, 'in') },
        bitIn,
      ),
    );
    if (tool && !input.toolPressureLoss) {
      throw new BusinessRuleError(
        'BHA_TOOL_PRESSURE_REQUIRED',
        'Enter the pressure loss of the motor and downhole tools',
        { component: tool.name },
      );
    }
  };

  const toWrite = (input: BhaRunInput, runNo: number): RunWrite => ({
    runNo,
    bitType: input.bitType ?? null,
    bitSize: input.bitSize,
    manufacturer: input.manufacturer ?? null,
    knownTfa: input.knownTfa ?? null,
    toolPressureLoss: input.toolPressureLoss ?? null,
    nozzles: input.nozzles,
    components: input.components,
  });

  return {
    get,

    async listByWell(wellId: string): Promise<BhaRun[]> {
      await wells.get(wellId);
      return (await repository.listByWell(wellId)).map(toRun);
    },

    /** A duplicate run number inside the well is rejected by the unique constraint (409). */
    async create(wellId: string, input: BhaRunInput): Promise<BhaRun> {
      await wells.get(wellId);
      check(input);
      const runNo = input.runNo ?? (await repository.nextRunNo(wellId));
      return get(await repository.insert(wellId, toWrite(input, runNo)));
    },

    /** Replaces the run with its nozzles and components. */
    async replace(id: string, input: BhaRunInput): Promise<BhaRun> {
      const current = await get(id);
      check(input);
      await repository.replace(id, toWrite(input, input.runNo ?? current.runNo));
      return get(id);
    },

    async remove(id: string): Promise<void> {
      await get(id);
      await repository.delete(id);
    },
  };
};
