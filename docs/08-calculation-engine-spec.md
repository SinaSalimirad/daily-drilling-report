# 08 — Calculation Engine Spec

`packages/calc` holds every formula of the workbook as pure TypeScript functions. Formulas and cell references are in `DMR_Workbook_Analysis.md` (sections 6–8); this document fixes how they are packaged and checked.

## Rules

1. **Pure.** Input in, output out. No database, no network, no clock, no global state.
2. **Two layers.**
   - `engines/*` work in the **workbook's oilfield units** and use the **workbook's constants** (for example 6.29 bbl/m³, 62.4 PCF, 8.33 ppg), so each line can be compared with a cell.
   - `si/*` are thin adapters: SI in → oilfield → engine → oilfield → SI out, using exact factors from `units`.
3. **Round only when showing a number (since v0.8.5).** The engines return exact values. The workbook rounded every cell "as displayed" and carried the rounded value on; the new system does not. Rounding belongs to the display (`apps/web/src/lib/format.ts`). The only `roundTo` calls left in the code clean binary noise (m³ ↔ bbl round trips) and are not workbook roundings.
4. **Decisions about the workbook are recorded.** Every place where the engine still does what the workbook does on purpose is commented `// Decision v0.8.5 (kept): …`; every defect of section 12 of the analysis has a decision in the table "Decisions of v0.8.5" below.
5. **Versioned.** `ENGINE_VERSION` is exported and stored with every result snapshot. It changes whenever an output can change.
6. **Every exported function has at least one test taken from the workbook.**

## Layout

```
packages/calc/
├─ src/
│  ├─ units/        # exact conversion factors, convert(value, from, to)
│  ├─ engines/      # oilfield units, workbook constants
│  ├─ si/           # SI adapters used by api and web
│  └─ index.ts      # ENGINE_VERSION and public exports
└─ fixtures/
   └─ workbook-2026-07-28.json   # inputs and expected values of report 1
```

## Exact conversion factors (`units`)

| From | To SI | Factor |
|---|---|---|
| bbl | m³ | 0.158987294928 |
| US gal | m³ | 0.003785411784 |
| in | m | 0.0254 |
| ft | m | 0.3048 |
| psi | Pa | 6894.757293168 |
| lb/ft³ (PCF) | kg/m³ | 16.01846337396 |
| ppg | kg/m³ | 119.8264273 |
| lb/bbl | kg/m³ | 2.853010174 |
| lb/100 ft² | Pa | 0.4788025898 |
| cP | Pa·s | 0.001 |
| °F | °C | (°F − 32) / 1.8 |

A value typed in a display unit, stored in SI and converted back must return the typed value (round-trip test).

## Function inventory

| Release | Module | Functions (oilfield layer) | Analysis ref |
|---|---|---|---|
| v0.2.0 | `units` | `convert`, unit-system presets | §6.1 |
| v0.2.0 | `pumps` | `pumpOutputPerStroke` | §6.2 |
| v0.4.0 | `inventory` | `finalStock`, `chemicalVolume`, `costOf`, `stockMass` | §7.2 |
| v0.5.0 | `geometry` | `sectionVolume`, `holeVolumeAtDepth`, `totalHoleVolume`, `averageHoleDiameter` | §6.6 |
| v0.5.0 | `string` | `drillPipeLength`, `steelVolume`, `internalVolume`, `closedDisplacement`, `totalFlowArea` | §6.7 |
| v0.5.0 | `volumes` | `holeStringAnnulus`, `totalCirculatingVolume`, `flowRate`, `bottomsUp`, `circulationTime`, `drilledVolume`, `pitTonnage` | §8.1 |
| v0.5.0 | `accounting` | `builtVolume`, `totalLosses`, `endVolume`, `balanceCheck`, `sectionTotals` | §8.2 |
| v0.6.0 | `rheology` | `plasticViscosity`, `yieldPoint`, `powerLawPipe`, `powerLawAnnulus` | §8.3 |
| v0.6.0 | `salt` | `brineDensityFromChlorides`, `naclWeightPercent`, `saltTableLookup` | §8.4 |
| v0.6.0 | `solids` | `solidsAnalysisWeighted`, `solidsAnalysisUnweighted`, `bentoniteContent` | §8.4 |
| v0.7.0 | `survey` | `tvdFromSurvey`, `tvdAtDepth`, `inclinationAtDepth` | §6.8 |
| v0.7.0 | `hydraulics` | `pipePressureLoss`, `annulusPressureLoss`, `bitPressureLoss`, `bitHydraulics`, `ecd`, `scaleToActual` | §8.5 |
| v0.7.0 | `hole-cleaning` | `slipVelocity`, `transport`, `cuttingConcentration`, `cleaningIndex` | §8.6 |

Before porting hydraulics, hole cleaning and both solids analyses, read their workbook formulas cell by cell; the analysis summarised them by pattern.

## Golden cases from the workbook (report 1)

The values are the workbook's. Since v0.8.5 the engines return the exact value, which agrees with these to the precision the workbook displayed (see "Decisions of v0.8.5").

| Function | Input | Expected | Cell |
|---|---|---|---|
| `pumpOutputPerStroke` | Triplex, liner 6 in, stroke 12 in, 95 % | 4.19 gal | `DMR!BP37` |
| `pumpOutputPerStroke` | Triplex, liner 6.5 in, stroke 12 in, 95 % | 4.91 gal | `DMR!BP39` |
| `sectionVolume` | ID 8.625 in, 0–2283 m | 86.06 m³ → **541.32 bbl** | `DMR!CI20`, `BR5` |
| `drilledVolume` | hole 9.625 in, 2283 m | 674.1 bbl | `DMR!AA17` |
| `pitTonnage` | 75 PCF, 150 bbl | 28.686 MT | `MudPits(2)!L9` |
| `pitTonnage` | 75 PCF, 30 bbl | 5.737 MT | `MudPits(2)!L14` |
| `chemicalVolume` (total) | day's usage | 3.714 m³ → 23.4 bbl | `Chem Inv.!AH76`, `DMR!R65` |
| `builtVolume` | water 157, chemical 23.4, diesel 0 | 180.4 bbl | `DMR!R69` |
| `endVolume` | start 0, received 541, built 180.4, return 0, losses 0 | 721 bbl | `DMR!R81` |
| `balanceCheck` | hole 541, active 180, reserve 0, end 721 | 0 (balanced) | `DMR!G86` |
| `finalStock` | initial 0, received 164, used 0 | 164 | `Chem Inv.!O11` |
| `brineDensityFromChlorides` | 188 000 mg/L | 1.198 | `DMR!BL380` |
| `naclWeightPercent` | 188 000 mg/L | 25.89 % | `DMR!BK380` |

The `sectionVolume` case shows what changed in v0.8.5: the workbook rounds to 86.06 m³ (the cell's display format) and then multiplies by 6.29: 541.32 bbl. The new system keeps 86.056 m³ and the exact factor: 541.28 bbl. The two agree to the precision the workbook displayed, which is how the tests compare (see "Test tolerance").

Report 1 has no drill string in the hole and no rheology readings, so it gives no golden values for rheology, hydraulics or hole cleaning. **Before v0.6.0 a second workbook file from a drilling day is needed** (with BHA, pump rates and dial readings) to build those fixtures.

## Test tolerance

Since v0.8.5 the expected values are the exact results. Each test names the workbook value next to the expected one and checks that they agree to the precision the workbook displayed (for example 541.28 bbl against the workbook's 541.32 bbl: the workbook rounded 86.06 m³ before multiplying). A difference larger than that is a bug.

## Decisions of v0.8.5

Decided by the owner on 2026-11-15: round only in the display; horsepower constant 1714 everywhere; one water weight. The consequences below follow from those decisions.

| Marker or defect | Decision |
|---|---|
| Intermediate rounding of volumes, flow, tonnage, brine density, TVD (every former `WORKBOOK-ROUNDING`) | **Removed.** Exact values; the web rounds for display. Golden values differ from the workbook only by the workbook's own rounding. |
| Workbook constants 6.29 bbl/m³, 3.785 L/gal, 2204 lb/t | **Replaced** by the exact factors of the table above. |
| Different ID rounding at the bit depth (2 decimals) and at TD (3 decimals) | **Removed** with the rounding. |
| Defect 6: bit horsepower ÷ 1740, system horsepower ÷ 1714 | **Corrected:** both ÷ 1714. |
| Defect 7: water 8.33 / 8.34 / 8.344 / 8.345 ppg and 62.4 / 62.35 PCF | **Corrected:** `WATER_PCF = 62.4` (pit tonnage), `WATER_PPG = 8.345` (hole cleaning); no other water weight in the engines. |
| Casing below a casing contributes zero (`CO20`) | **Kept**: a casing string inside another is not a hole interval. |
| Section and well total losses recomputed from the books, shakers as the balancing item | **Kept**: the workbook's behaviour for the recap. |
| First survey interval from the surface | **Kept.** |
| Balance check compares whole-barrel values | **Kept as a tolerance:** the books balance when the difference is below half a barrel. |
| Defects 1, 3, 4, 5, 9, 10–17 (dates as text, `MudP` gating, tenth SCE unit, unanchored lookup, row identity, links, licence, macros …) | **Not applicable:** the online system has no such cell logic. |
| Defect 2: annulus pressure-loss typo | **Not copied**; the engine uses the formula the report uses. |
| Defect 8: solids analysis on empty retort data | **Corrected:** no solids result without data (the result is not exposed at all until KI-006 is solved). |

## Still open

- KI-006: the solids analysis is not reconciled with the workbook cells.
- KI-007: hydraulics and hole cleaning have no workbook golden case.
