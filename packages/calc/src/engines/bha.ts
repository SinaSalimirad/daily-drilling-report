// Tool recognition of the BHA sheet (`BHA!B32:B57`, `N16:O17`; analysis §6.7). The sheet
// matches the typed component name against 26 spellings (with and without a trailing
// space); a recognised tool whose outside diameter is not the bit size needs the pressure
// loss of the motor or downhole tool.

/** WORKBOOK-ROUNDING: spellings of the workbook list, compared without case and edge spaces. */
const TOOL_NAMES = new Set([
  'bit',
  'motor',
  'down hole tools',
  'down hole tool',
  'dht',
  'mud motor',
  'm motor',
  'bit & motor',
  'bit & mud motor',
  'bit & m motor',
  'bit & bit sub',
  'bit & nb stb',
]);

export const isRecognisedTool = (name: string) => TOOL_NAMES.has(name.trim().toLowerCase());

/** True when the component is a motor or downhole tool that needs a pressure loss. */
export function needsToolPressureLoss(
  component: { name: string; odIn: number },
  bitSizeIn: number,
): boolean {
  return isRecognisedTool(component.name) && component.odIn !== bitSizeIn;
}
