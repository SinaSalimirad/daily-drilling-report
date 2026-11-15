# Known issues

Problems found while building DMR Online that are not solved in the task that found them: data that does not fit the model, quirks of the analysed workbook, missing information. Each one gets an entry here **and** a GitHub issue, so it is neither forgotten nor solved twice.

How to use this register (also in `CLAUDE.md` and `docs/10-git-workflow.md`):

1. Add an entry with the next id (`KI-nnn`): what was found, where, the impact, and what was done for now.
2. Open an issue and link it: label `bug` for a defect in our code or data model, `needs-decision` when a choice is open.
3. When the issue is closed, set the status to **Handled** and say how. Entries are never deleted.

Workbook defects found by the original analysis are in `DMR_Workbook_Analysis.md` §12 and are decided in v0.8.5; they are not repeated here.

## Open

| Id | Found in | Problem | Impact | For now | Issue |
|---|---|---|---|---|---|
| KI-001 | #28 demo seed | The catalogue needs a numeric package size and a unit from `kg, lb, t, gal, l, m3, bbl`, with unique names. Three workbook items do not fit: "Mud Skid" (no size, no unit) and "Tarpaulin" twice (sizes `10*10` and `10*15` as text, same name). | Items counted per piece cannot be entered, so their stock and cost cannot be tracked. | Left out of the demo seed (25 of the 28 products). | #95 (bug, needs decision) |
| KI-002 | #28 demo seed | The product list of all three analysed workbooks has no unit prices. | The demo seed has a catalogue but no price list; the cost results of v0.4.0 cannot be checked against workbook numbers. | Demo seed without a price list. Decide before v0.4.0. | #96 (needs decision) |

## Handled

| Id | Found in | Problem | How it was handled |
|---|---|---|---|
| KI-003 | #17 lookups | The workbook's activity list (`DMR!FV8:FV68`) has two names twice ("Run Completion", "Work Direction") and names with trailing spaces. | Names trimmed, duplicates kept once (56 distinct fixed names + 3 custom names). #17. |
| KI-004 | #17 lookups | The analysis summarised the pit mud type list as "systems + 15 pills (PHG, HI VIS, …)"; the workbook's names are "PHG PILL", "HI VIS PILL", …, and the list has 29 names without "Fresh Water". | Seed corrected, wrongly seeded names archived by the seed, analysis §5.6 corrected. #17. |
