# Git branch strategy

A lightweight flow with two long-lived branches, matching the two environments.

```
feat/login ──┐
fix/typo   ──┼─► develop ──(PR)──► main
chore/deps ──┘      │                 │
                    ▼                 ▼
                 staging          production
```

## Long-lived branches

| Branch | Purpose | Deploys to | Protection |
| --- | --- | --- | --- |
| `main` | Always production-ready | production (manual approval) | PR only, 1 review, `CI success` + `Lint` + `Secret scan` required, no force-push |
| `develop` | Integration branch | staging (automatic) | PR only, `CI success` + `Lint` required, no force-push |

## Short-lived branches

Branch from `develop`, merge back into `develop` with a PR, then delete the branch.

| Prefix | Use | Example |
| --- | --- | --- |
| `feat/` | New feature | `feat/reports-table` |
| `fix/` | Bug fix | `fix/mud-weight-rounding` |
| `chore/` | Tooling, deps, config | `chore/bump-bun` |
| `docs/` | Documentation only | `docs/branch-strategy` |
| `refactor/` | No behaviour change | `refactor/reports-service` |
| `hotfix/` | Urgent production fix, **branches from `main`** | `hotfix/api-crash` |

Names are lowercase, kebab-case, optionally prefixed with an issue number (`feat/123-reports-table`).

## Day-to-day flow

1. `git switch develop && git pull`
2. `git switch -c feat/<name>`
3. Commit small, push, open a PR **into `develop`**.
4. CI must be green and one person reviews. **Squash merge**, so `develop` has one commit per PR.
5. Merge to `develop` deploys to staging automatically. Test there.

## Releasing

1. Open a PR `develop` → `main`. Use a **merge commit** (not squash) so the two branches keep shared history.
2. CI runs, reviewer approves, merge.
3. The production deploy waits for approval in the GitHub `production` environment.
4. Tag the release on `main`: `git tag -a v1.4.0 -m "v1.4.0" && git push origin v1.4.0` (semantic versioning).

## Hotfix

1. Branch `hotfix/<name>` from `main`, fix, PR into `main`, deploy.
2. Immediately merge `main` back into `develop` so the fix is not lost.

## Commit messages and PR titles

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`

```
feat(reports): add depth column to table
fix(api): reject negative mud weight
chore(deps): bump drizzle-orm
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`. With squash merge the **PR title** becomes the commit message, so it must follow this format.

## Rules of thumb

- Never commit directly to `main` or `develop`.
- Keep PRs small (aim for under ~400 changed lines).
- Rebase your feature branch on `develop` rather than merging `develop` into it.
- Never commit secrets. `.env` is ignored and gitleaks scans every PR.
- Delete branches after merge (enable "Automatically delete head branches").

## One-time setup

```bash
git switch -c develop && git push -u origin develop
```

Then in GitHub: Settings → Branches → add protection rules for `main` and `develop`, and Settings → Environments → create `staging` and `production` (add required reviewers on `production`).
