# CI/CD

GitHub Actions, in `.github/workflows/`. Bun version is pinned in each workflow (`BUN_VERSION`); keep it in sync with `package.json` `packageManager` and the Dockerfiles.

## Workflows

| File | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | PR, push to `main` | API typecheck + build, web tests + build; final `CI success` gate job |
| `lint.yml` | PR, push to `main` | Biome lint + format check |
| `secret-scan.yml` | PR, push, weekly | gitleaks over full history |
| `docker-build.yml` | push to `develop` and `main` | Build `api` and `web` images, push to GHCR as `sha-<short>` plus the branch name |
| `deploy-staging.yml` | docker-build succeeded on `develop` | Deploy that image tag to staging |
| `deploy-production.yml` | docker-build succeeded on `main` | Deploy that image tag to production, after environment approval |
| `dependabot.yml` | weekly | Bun, Docker and Actions updates |

> Status: `ci.yml`, `lint.yml`, `secret-scan.yml` and `dependabot.yml` exist. `docker-build.yml`, `deploy-staging.yml` and `deploy-production.yml` are currently empty files and still need to be written.

## Pipeline

```
PR to develop ──► ci + lint + secret-scan   (must pass to merge)
merge to develop ─► docker-build ─► deploy-staging
PR develop→main ──► ci + lint + secret-scan
merge to main ────► docker-build ─► [approval] ─► deploy-production
```

The same image built from a commit is what gets deployed. It is tagged by commit SHA and is never rebuilt per environment.

## Required status checks (branch protection)

- `CI success` (single gate, so job names can change without editing settings)
- `Biome (lint + format)`
- `Gitleaks`

## Deploy mechanism

1. Workflow logs in to GHCR and rsyncs `infra/` to the server.
2. Over SSH on the server: `docker compose -f infra/docker/compose.prod.yml pull && up -d --remove-orphans` with `IMAGE_REPO` and `IMAGE_TAG`.
3. The `migrate` service runs, then `api`, then nginx health checks pass.
4. Workflow fails if the stack is not healthy after the timeout.

Deploys to one environment run serially (`concurrency` group per environment, no cancel-in-progress).

## GitHub configuration

**Environments** (Settings → Environments): `staging`, `production` (add required reviewers to `production`).

Per-environment secrets/variables:

| Name | Kind | Meaning |
| --- | --- | --- |
| `DEPLOY_HOST` | secret | server hostname/IP |
| `DEPLOY_USER` | secret | SSH user |
| `DEPLOY_SSH_KEY` | secret | private key (deploy-only key) |
| `DEPLOY_KNOWN_HOSTS` | secret | output of `ssh-keyscan` verified once, so host identity is pinned |
| `DEPLOY_PATH` | variable | directory on the server containing `.env` |

`GITHUB_TOKEN` is used for GHCR; no extra registry secret is needed. Set workflow `permissions` per job (least privilege): `packages: write` only for the build job.

## Local equivalents of CI

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build
```

## Recommended additions (not implemented)

- A `bun test` step for the **API** in `ci.yml` (web tests already run; API has `*.schema.test.ts` files that CI does not run yet).
- CI also triggers only on push to `main`; add `develop` once that branch exists.
- A CI check that `bun run db:generate` produces no diff, to catch forgotten migrations.
- PR title check for Conventional Commits.
- Trivy image scan in `docker-build.yml`.
