# 10 — Git Workflow

One rule produces the clean history:

> **one task = one issue = one branch = one pull request = one commit on `main`**

## Branches

- `main` is always releasable and protected. Nobody pushes to it directly.
- One short-lived branch per issue, from the latest `main`:

```
<type>/<issue-number>-<short-description>
feat/14-wells-crud
fix/37-report-date-duplicate
```

- Keep a branch up to date with `git rebase origin/main`. No merge commits from `main` into a branch.
- A branch lives a day or two. If the work is bigger, the issue is too big: split it.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/). Commits inside a branch can be messy; only the squashed commit must be right.

```
<type>(<scope>): <summary in the imperative, lower case, no full stop> (#<issue>)

feat(api): add wells CRUD routes (#14)
fix(calc): round section volume before unit conversion (#52)
```

| Type | Use |
|---|---|
| `feat` | New behaviour for a user or a client of the API |
| `fix` | Bug fix |
| `refactor` | Code change without behaviour change |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, configuration |
| `ci` | Pipeline |
| `build` | Docker, bundling |
| `perf` | Performance |

Scopes: `api`, `web`, `calc`, `schemas`, `db`, `infra`, `ci`, `docs`, `repo`.

A breaking change adds `!` after the scope and a `BREAKING CHANGE:` line in the body.

## Pull requests

- **Title = the final commit message**, including `(#issue)`.
- Body starts with `Closes #<issue>` and follows the template (what, why, how to test, checklist).
- Small: one issue, ideally under 400 changed lines excluding generated files.
- A schema change and its migration are in the same pull request.
- Must be green: Biome, type check, tests, build.
- Review: CodeRabbit on every pull request; read its comments before merging.
- Merge with **Squash and merge** only. Delete the branch.

## Repository settings (once)

- Allow squash merging only; default commit message "Pull request title".
- Automatically delete head branches.
- Branch protection on `main`: require a pull request, require status checks, require linear history, no force pushes.

## Issues

Every task is an issue before work starts. Fields:

| Field | Content |
|---|---|
| Title | The future commit message without the number: `feat(api): add wells CRUD routes` |
| Task ID | Stable key such as `V020-03`, used for dependencies |
| Goal | One or two sentences |
| Tasks | Checklist of steps |
| Acceptance criteria | Observable results |
| Depends on | Task IDs |
| Labels | One `type:*`, one or more `area:*`, optional `size:*` |
| Milestone | The version |

Labels:

- `type:feature`, `type:fix`, `type:chore`, `type:docs`, `type:test`, `type:epic`
- `area:api`, `area:web`, `area:calc`, `area:schemas`, `area:db`, `area:infra`, `area:ci`, `area:docs`
- `size:S` (up to 2 hours), `size:M` (half a day), `size:L` (one day). Larger than `L`: split.
- `blocked`, `needs-decision`

An **epic** is an issue with `type:epic` that lists a later version's scope. It is split into task issues when that version starts.

## Milestones and releases

- One milestone per version (`v0.1.0`, …). A version is done when its milestone has no open issue.
- Release: update `CHANGELOG.md` from the commit list, then tag `main`:

```
git tag -a v0.2.0 -m "v0.2.0 — Master data"
git push origin v0.2.0
```

- The tag triggers the release pipeline (see `11-environments-and-deployment.md`).
- Versions follow SemVer. Before 1.0.0: a minor version is a roadmap step; a patch is a fix or a small agreed addition (for example `v0.8.5`).

## Hotfix

Same flow, started from `main`: issue → `fix/<n>-…` → pull request → squash → patch tag. There are no long-lived release branches.

## Daily routine

```
git switch main && git pull
git switch -c feat/14-wells-crud
# work, commit freely
git fetch origin && git rebase origin/main
git push -u origin feat/14-wells-crud
# open the pull request with the commit-style title and "Closes #14"
# green checks + review read → Squash and merge
```

## Never

- Force-push `main`.
- Merge with a merge commit or rebase-merge.
- Put two issues in one pull request, or one issue in two.
- Commit `.env`, database dumps or build output.
- Edit a migration that is already on `main`.
