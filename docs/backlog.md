# Backlog (things to do later)

Ideas and missing features we decided to postpone. When someone says "note this for later",
add an entry here instead of losing it. When an item is done, move it to **Done** with the
PR or commit that finished it.

Each entry: a short title, why it matters, and what "done" looks like.

## Open

### Restrict deleting products to managers and above

- **Added:** 2026-11-13
- **Area:** API (auth), web
- **Why:** Right now anyone who can reach the API can `DELETE /api/v1/products/:id`. A normal
  user must not be able to delete products; only a manager or higher role should.
- **Done when:**
  - The API requires a logged-in user for the delete endpoint and returns `401` without one.
  - A user below manager gets `403`; manager and above can delete.
  - The web app hides or disables "Delete product" for users who can't use it.
  - Tests cover the allowed and forbidden cases.
- **Depends on:** Authentication and roles (roadmap `v0.4.0`). Other write endpoints (create,
  edit, inventories) probably need a role rule too; decide that in the same task.

## Done

_Nothing yet._
