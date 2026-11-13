# Roadmap and release plan

Versioning follows semantic versioning. The project stays on `0.x` until the v1.0.0 criteria below are met.

## Where we are (v0.1)

| Area | Status |
| --- | --- |
| Products, inventories | Done (API + web) |
| Wells, reports, sections | DB schema only |
| Authentication / roles | Not started |
| Tests | A few schema/form unit tests; API tests not run in CI |
| `develop` branch, staging, production deploy | Not set up (`compose.prod.yml` and deploy workflows are empty/missing) |

## Milestones

| Version | Goal |
| --- | --- |
| `v0.2.0` | Wells + sections API and UI |
| `v0.3.0` | Daily report create / view / edit (core feature) |
| `v0.4.0` | Authentication and roles |
| `v0.5.0` | Staging deploy works end to end; API tests in CI |
| `v1.0.0-rc.1` | Limited beta with real users on staging |
| `v1.0.0` | Production release |

## v1.0.0 criteria

1. A full daily drilling report can be created, viewed and edited from the UI.
2. Users must log in; permissions are enforced on the API.
3. Critical logic (report calculations, validation) has tests, and CI runs them.
4. `develop` → staging → production pipeline works, with at least one full production deploy done with approval.
5. Database backups are scheduled and a restore was tested.
6. Real users used it on staging for one to two weeks with no critical bugs open.

## Cutting a release

Follow [git-branch-strategy.md](git-branch-strategy.md#releasing): PR `develop` → `main`, merge commit, tag `vX.Y.Z` on `main`.
