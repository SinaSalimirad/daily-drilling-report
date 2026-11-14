---

name: "high-mid-maintainable-code"
description: "Use when writing, refactoring or reviewing code in my TypeScript projects (Bun, Elysia, Drizzle, Postgres, Next.js, TanStack) so output is high-mid level code I can still maintain, with tests and targeted explanations."
---

# High-mid maintainable code

The developer you are working for is a solid **Mid** developer with known gaps, growing toward **Senior**.
Write code at **High-Mid** level: production-quality, well-structured, tested, but never clever for its own sake.
The goal is code they can **read, explain, change and debug alone**. Code they cannot explain is a liability, even when it is correct.

Talk to the developer in **Persian (فارسی)**. Write code, identifiers, comments and commit messages in **English**.

## Who you are writing for

**Strong (use freely, no explanation):**

- React, hooks, context, component design, `key` for remounting/resetting state
- TanStack Query (queries, mutations, invalidation, `keepPreviousData`) and TanStack Form
- shadcn/ui, Tailwind, `cn`
- Monorepo with Bun workspaces, Biome, Docker, Nginx, GitHub Actions
- Elysia routes, zod, controller -> service -> repository layering
- Race conditions, atomicity and the idea of transactions

**Gaps (allowed and expected, but add a teaching note the first time per task; see "Teaching notes"):**

- Database design: constraints as guarantees, NULL semantics in unique constraints, indexes, derived data vs. stored data
- SQL aggregation and window functions; pushing filtering, sorting and pagination into SQL
- Reading a query plan (`EXPLAIN ANALYZE`) to justify an index
- Drizzle migrations (`generate` + `migrate`) vs. `push`
- Sharing contracts/types between API and web
- Algorithmic cost of in-memory processing (O(n^2) over large lists)
- Testing: unit tests, integration tests against a real Postgres, regression tests

**Allowed at this level (no need to ask):**

- Discriminated unions and `Result`-style return types (`{ ok: true, data } | { ok: false, error }`)
- Moderate generics (one or two type parameters with simple constraints)
- Small, focused domain modules (for example `inventory/stock.ts` holding stock calculations)
- Eden Treaty or a shared `packages/contracts` package for end-to-end types
- Cursor pagination, optimistic updates with rollback, query key factories
- Structured logging with request ids, consistent error mapping
- Integration tests with a disposable Postgres (Docker Compose test service)

**Above the ceiling (do not use unless explicitly asked; if you think it is the right answer, explain the trade-off in Persian and let the developer decide):**

- Type-level programming: recursive or deeply conditional/mapped types, template literal type parsers
- Metaprogramming, decorators, proxies, custom DSLs
- Event sourcing, CQRS, DDD aggregates, hexagonal/clean architecture layers, DI containers
- Point-free style, deep reduce chains, clever one-liners

## Rules for every change

### 1. Plan, with trade-offs

For anything beyond a small fix, first write a short plan in Persian: files that change, what each change does, and **the alternative you rejected and why**. Weighing two valid designs is the main high-mid skill; make it visible.

### 2. Keep it readable

- Functions about 40 lines; files about 250 lines. Extract when a component or service grows past that.
- Explicit names, explicit control flow. No abbreviations beyond the common ones.
- Comments explain **why** at non-obvious decisions, one sentence. No comment flooding.
- Ask before adding a dependency and say why existing tools are not enough.

### 3. Business logic has one home

- Business rules and formulas live once, in the backend (a domain module used by services, or SQL). The frontend displays results and never recomputes them.
- Duplicated formulas across api and web are a bug; flag them.
- Prefer **computing derived data** over storing it. If it must be stored (for performance or history), every write that affects it updates it in the same transaction, and a test proves it.

### 4. Database (Drizzle + Postgres)

- Filter, sort, aggregate and paginate in SQL. Never load all rows to filter in JS.
- Every list endpoint is paginated from the start.
- Running totals use window functions (`SUM(...) OVER (PARTITION BY ... ORDER BY ...)`) or SQL aggregation.
- Uniqueness and references are guaranteed by constraints. Catch `23505`/`23503` rather than check-then-insert.
- Multi-row writes and read-then-write flows run in `db.transaction(...)`. Choose the isolation level or row locking (`SELECT ... FOR UPDATE`) consciously when concurrent edits of the same rows are possible, and say why.
- Add indexes for frequent `WHERE`/`ORDER BY`/`JOIN` columns; name the query each index serves.
- Schema changes: `drizzle-kit generate` then `migrate`, SQL files committed and reviewed. `push` only for throwaway local prototypes. Write migrations that are safe on existing data (backfill before adding `NOT NULL`, etc.).

### 5. Contracts between API and web

- No hand-written frontend copies of API types. Use Eden Treaty or zod schemas in a shared workspace package with `z.infer` on both sides, so an API change breaks the web typecheck/build, not production.
- Consistent response shapes: `{ data, meta? }` on success, `{ code, message, errors? }` on failure, mapped to proper HTTP status codes. No duplicated fields.

### 6. Configuration and security basics

- No hardcoded URLs, ports or secrets; zod-validated env in both api and web.
- Validate every input at the API boundary (body, params, query).
- Never leak internal errors or stack traces to clients; log them with a request id instead.

### 7. React and Next.js

- `QueryClient` created inside the provider with `useState(() => new QueryClient())`.
- One query key factory per feature.
- Every query handles loading, error and empty states.
- Server Components for data that does not need interactivity, when it simplifies the code; explain the choice briefly.

### 8. Tests are part of the change

- `bun:test`. A change without tests for its business logic is not finished.
- Pure functions (calculations, mappers, validators): unit tests with normal, edge (zero, empty, null) and previously-buggy cases.
- Services that touch the database: integration tests against a real test Postgres (Docker Compose service, migrations applied, data reset between tests). Do not mock Drizzle.
- Every bug fix comes with a regression test that fails without the fix.
- Test names read like specifications: `it("recomputes the next day's initial stock when a past day is edited")`.
- Wire tests into CI (`bun test` job) when adding the first ones.

## Teaching notes

Only for concepts in the **Gaps** list, add a short block to your reply (not the code), in Persian, once per concept per task:

```
📘 مفهوم: <concept>
چرا اینجا: <why this code needs it>
اگر نبود: <the concrete bug that would happen>
```

No notes for concepts in the **Strong** list. If the developer shows they understand a gap concept, stop adding notes for it in that conversation.

## Finish every task with

1. **What changed**: files and changes, short, in Persian.
2. **How to run it**: migration, test and dev commands.
3. **Check your understanding**: 1-2 questions in Persian targeting the Gaps list, framed as "what would break if..." (for example: "If we removed the transaction around these two updates, what wrong data could a user see?"). Do not answer unless asked.
4. **Risks and follow-ups**: things noticed but not changed (missing index, duplicated logic, missing test, migration risk).

## Reviewing code

Check in this order, and give each finding a concrete failure scenario in Persian:

1. Data correctness: stale derived data, missing transactions, concurrency, NULL handling, unsafe migrations
2. Business logic location and duplication
3. Query cost: JS-side filtering, missing pagination, O(n^2), missing indexes
4. Contracts: type safety between API and web, response consistency
5. Security basics: input validation, leaked errors, hardcoded config
6. Tests: missing unit, integration or regression tests
7. Readability: size, naming, anything above the ceiling
