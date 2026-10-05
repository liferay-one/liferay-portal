# Liferay One Workspace

Instructions here stack on top of the repo root instructions — when the two conflict, this file wins. `.claude/CLAUDE.md` is a symlink to this file, so Claude Code loads it for any work under this workspace.

Two further files sit beside it, each reachable through its own symlink under `.claude/`:

- [`liferay-rules.md`](./liferay-rules.md) (`.claude/cx.md` is a symlink to it) — the generic Liferay Workspace rules: how to establish the workspace root, the DXP version, and the bundle state. Read it when the task is about the workspace shell rather than about this product.
- [`skills/initial-setup-guide/SKILL.md`](./skills/initial-setup-guide/SKILL.md) (`.claude/setup.md` is a symlink to it) — first time setup.

The canonical code style for the whole repository lives in `pr-reviewer/rules`, one numbered file per rule, with the philosophy behind them in `pr-reviewer/STYLE.md`. The rules below add what is specific to this workspace and cite those numbers in brackets where the two meet.

## Architecture

Pure Liferay SaaS client-extension workspace — no OSGi modules, no Ant. Client extensions under `client-extensions/`:

- `liferay-one-batch/` — batch client extension for importing Object definitions, list types, and other headless resources.
- `liferay-one-custom-element/` — single React element serving Marketplace, Support, and Admin page groups.
- `liferay-one-etc-spring-boot/` — custom REST, Salesforce Pub/Sub subscriber, crons, integration clients.
- `liferay-one-global-css/` — shared styles.
- `liferay-one-instance-settings/` — global Liferay instance configs.
- `liferay-one-site-initializer/` — single site, all Object definitions + roles + fragments.

## Related Repos

The migration and ETL scripts that load this product's data live in a sibling `scripts` checkout — `liferay-one/scripts` on GitHub, conventionally `../../../scripts` from here. Its `one/scripts/migration/` scripts write the objects defined in `client-extensions/liferay-one-batch/batch/`, through the headless APIs and the `liferay-one-etc-spring-boot` endpoints.

Before changing an object ERC, a field name, an endpoint path, or an enum value, grep that checkout for it and record what breaks — a rename here silently breaks a loader there. Repair it in a companion ticket against that repo, never in a workspace PR ([`rules/pr-hygiene.md`](./rules/pr-hygiene.md) — one workspace, one PR).

The `/one-team` skill runs a four-agent team against either repo; see [`skills/one-team/SKILL.md`](./skills/one-team/SKILL.md).

## Development

Run from `workspaces/liferay-one-workspace/`.

- Start environment: Run `/one-env-up` skill.
- Stop environment: Run `/one-env-down` skill.
- Reset environment: Run `/one-env-reset` skill.
- Liferay MCP setup: Run `/one-mcp` skill.
- **Build:** `./gradlew build`
- **Lint:** `yarn lint`
- **Format:** Run the `/format-source` skill.
- **Deploy:** Run the `/one-deploy` skill.
- **Pre-commit:** Run format and build first; do not deploy a failing build.
- **Rebase:** Run the `/one-rebase` skill.
- PR: Run the `/one-pr` skill.

## Rules

`.agents/rules/` contains coding standards and PR conventions derived from Brian Chan's review feedback. Read these before writing or reviewing code. Most carry a `paths:` scope in their frontmatter, so they load for the client extension they govern:

- [`rules/code-style.md`](./rules/code-style.md) — sorting, log conventions, string concatenation, FreeMarker, Java ordering
- [`rules/concurrency.md`](./rules/concurrency.md) — shared state on Spring singletons, formatter fields, React effect races
- [`rules/css-sort-order.md`](./rules/css-sort-order.md) — selector group order (`&`, elements, IDs, classes, at rules) and the cascade exceptions
- [`rules/custom-element-safety.md`](./rules/custom-element-safety.md) — CSRF, XSS, filter injection, unbounded pagination, timezone-safe dates
- [`rules/custom-element-structure.md`](./rules/custom-element-structure.md) — file location by tier, read and write separation, page and component placement
- [`rules/data-access.md`](./rules/data-access.md) — one-row reads, service calls in loops, pagination bounds
- [`rules/naming.md`](./rules/naming.md) — brand name casing, file naming, REST controller naming
- [`rules/object-naming.md`](./rules/object-naming.md) — ERC patterns, Object names, field casing
- [`rules/page-folder-structure.md`](./rules/page-folder-structure.md) — one subfolder per sub-page component
- [`rules/pr-hygiene.md`](./rules/pr-hygiene.md) — PR scope, merge conflicts, commit messages
- [`rules/simplified-technical-english.md`](./rules/simplified-technical-english.md) — ASD-STE100 controlled language for everything a person reads
- [`rules/spring-boot-analysis.md`](./rules/spring-boot-analysis.md) — SpotBugs coverage, its limits, and the open findings

## Specs

`.agents/specs/` documents the stable shape of this workspace. Read these before making any implementation decisions — they are the fastest way to find where something lives and why. Nothing under `.agents/` is authoritative, though: the object definitions in `client-extensions/liferay-one-batch/batch/` and the `liferay-one-etc-spring-boot` controllers are the source of truth for ERCs, fields, list types, and endpoints, and a spec that disagrees with them is stale.

- [`specs/workspace.md`](./specs/workspace.md) — shell layout, client extensions, naming conventions
- [`specs/data-model.md`](./specs/data-model.md) — full entity index, ERC + FriendlyURL registry, field mappings

For the API surface, page/route map, and integration contracts, read the code directly (Spring Boot controllers in `liferay-one-etc-spring-boot`, the service layer and `src/pages/` in `liferay-one-custom-element`) — these change too often for a parallel spec to stay accurate.