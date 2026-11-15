# CLAUDE.md

DMR Online: a web app that replaces the macro Excel workbook for daily drilling (mud) reports. Bun monorepo: `apps/api` (Elysia), `apps/web` (Next.js, frontend only), `packages/schemas` (zod), `packages/calc` (pure engines, units).

## The documents are the source of truth

Before you start a task, read the documents in `docs/` that cover it:

| Question | Document |
|---|---|
| Architecture, design principles | `docs/01-architecture-overview.md` |
| Where a file goes, dependency rules, naming | `docs/02-folder-structure.md` |
| Tables, migrations | `docs/03-database-schema-and-migrations.md` |
| Route shape | `docs/04-api-conventions.md` |
| Errors | `docs/05-error-flow.md` |
| Logging | `docs/06-logging.md` |
| Auth and permissions | `docs/07-authentication-and-authorization.md` |
| Formulas, rounding, engine rules | `docs/08-calculation-engine-spec.md`, `docs/DMR_Workbook_Analysis.md` |
| Tests | `docs/09-testing-strategy.md` |
| Branches, commits, pull requests | `docs/10-git-workflow.md` |
| Environments, deployment | `docs/11-environments-and-deployment.md` |
| Version scope, definition of done | `docs/12-roadmap-and-release-plan.md`, `docs/.github/issues.md` |
| Libraries, product decisions | `docs/stack-decisions.md` |

## Ask when the documents do not answer

**This rule overrides your own judgment.** Stop and ask the user (with the AskUserQuestion tool when it is available) instead of deciding yourself when:

- the documents say nothing about the case in front of you;
- two documents, or a document and the code, contradict each other;
- a document is ambiguous and the readings lead to different code;
- a task needs a library, table, column, route, permission or folder that the documents do not list;
- a workbook formula, constant or rounding step is unclear, or a test value does not match the workbook;
- a fix would change a decision marked **FIXED** or listed in `stack-decisions.md`;
- something fails (build, test, migration, install) and the cause is not clear from the output.

When you ask:

1. Say what you found, which documents you checked, and why they do not settle it.
2. Offer the options you see, with your recommendation first.
3. Wait for the answer. Do not pick a "reasonable default", write a placeholder, or work around the problem in the meantime.
4. If the answer is a lasting decision, offer to add it to the right document so the next task finds it there.

You do not need to ask about things the documents already decide, or about purely mechanical details with no effect on behaviour (a local variable name, the order of imports).

## Hard rules (summary; the documents have the details)

- `routes` → `service` → `repository`; never skip or reverse a layer. A service calls another module's service, never its repository.
- `packages/calc` performs no I/O and imports nothing from the apps. `packages/schemas` imports only zod.
- `apps/web` imports from `apps/api` as a type only. Cross-workspace imports use `@ddr/*`, never relative paths.
- Values are stored in SI; conversion happens only in `packages/calc/units`.
- Engines follow the workbook until v0.8.5; mark copied rounding `// WORKBOOK-ROUNDING` and copied defects `// WORKBOOK-QUIRK: <n>`.
- Every function in `packages/calc` has a test with values taken from the workbook.
- Commit, push or open a pull request only when the user asks.
