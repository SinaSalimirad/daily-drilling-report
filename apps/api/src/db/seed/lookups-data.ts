// The workbook's open lists, in workbook order (docs/DMR_Workbook_Analysis.md §5.6).

/** Activity dropdown, `FV8:FV68` (58 fixed activities). */
export const ACTIVITIES: string[] = [];

/** "Sample from", `FB9:FB29` (21 cells, 18 distinct names). */
export const SAMPLE_SOURCES = [
  'Active',
  'Reserve',
  'Flow Line',
  'Recd Mud',
  'Return Mud',
  'Treated Fluids',
  'Brine',
  "Bottom's Up",
  'Drill water',
  'Canal Water',
  'Recd Water',
  'Sea Water',
  'Potable Water',
  'Waste Pit',
  'Cleared Water',
  'Completion Fluid',
  'Brackish Water',
  'Other',
];

/** Active fluid system, `MudPits(2)!T41:T55`. */
export const FLUID_SYSTEMS = [
  'Drill Water',
  'Bentonite Mud',
  'Salt Mud',
  'Salt Saturate Mud',
  'KCl/Salt Mud',
  'Inhibited Mud',
  'HPHT Mud',
  'Low Weight Mud',
  'NaCl Brine',
  'CaBr2 Brine',
  'CaCl2 Brine',
  'CaCl2 / NaCl',
  'Oil Base Mud',
  'Invert Emulsion Mud',
  'Fresh Water',
];

/**
 * Pills and special fluids of the pit mud type list, `MudPits(2)!V41:V69`.
 * The workbook's pit mud type dropdown is the fluid systems followed by these.
 */
export const PIT_MUD_TYPES = [
  'PHG',
  'HI VIS',
  'LCM',
  'Low Vis',
  'KILL MUD',
  'SLUG',
  'High pH',
  'PIPE LAX',
  'KCl',
  'Inhibition',
  'Detergent',
  'Solution',
  'CMT Solution',
  'LPM',
  'Contingency',
];
