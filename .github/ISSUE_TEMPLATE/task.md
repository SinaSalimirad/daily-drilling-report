---
name: Task
about: One task = one branch = one pull request = one commit on main (docs/10-git-workflow.md)
title: "<type>(<scope>): <summary in the imperative, lower case>"
labels: []
---

<!--
Title = the future commit message without the number, e.g. feat(api): add wells CRUD routes
Labels: one type:*, one or more area:*, optional size:* (S up to 2 h, M half a day, L one day; larger: split)
Milestone: the version
-->

**Task ID:** `VXXX-NN`  
**Milestone:** vX.Y.Z

## Goal
<!-- One or two sentences. -->

## Tasks
- [ ] 

## Acceptance criteria
- [ ] 

## Depends on
<!-- #<issue> (`<Task ID>`), or Nothing -->
Nothing

## References
- `docs/`

---
Branch `<type>/<issue-number>-<short-description>`. Pull request title = this issue's title + ` (#<issue-number>)`. Squash merge. If part of this already exists in the repository, verify it against the acceptance criteria instead of rewriting it.
