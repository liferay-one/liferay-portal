# Liferay One Workspace

Instructions here stack on top of the repo-root instructions — when the two conflict, this file wins.

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
- **Format:** Run the `/format-source` skill.
- **Deploy:** Run the `/one-deploy` skill.
- **Pre-commit:** Run format and build first; do not deploy a failing build.
- **Rebase:** Run the `/one-rebase` skill.
- PR: Run the `/one-pr` skill.

## Rules

`.agents/rules/` contains coding standards and PR conventions derived from Brian Chan's review feedback. Read these before writing or reviewing code:

- [`rules/code-style.md`](./rules/code-style.md) — sorting, log conventions, FreeMarker, Java ordering
- [`rules/naming.md`](./rules/naming.md) — brand name casing, file naming, REST controller naming
- [`rules/object-naming.md`](./rules/object-naming.md) — ERC patterns, Object names, field casing
- [`rules/pr-hygiene.md`](./rules/pr-hygiene.md) — PR scope, merge conflicts, commit messages

## Specs

`.agents/specs/` documents the stable shape of this workspace. Read these before making any implementation decisions — they are the fastest way to find where something lives and why. Nothing under `.agents/` is authoritative, though: the object definitions in `client-extensions/liferay-one-batch/batch/` and the `liferay-one-etc-spring-boot` controllers are the source of truth for ERCs, fields, list types, and endpoints, and a spec that disagrees with them is stale.

- [`specs/workspace.md`](./specs/workspace.md) — shell layout, client extensions, naming conventions
- [`specs/data-model.md`](./specs/data-model.md) — full entity index, ERC + FriendlyURL registry, field mappings

For the API surface, page/route map, and integration contracts, read the code directly (Spring Boot controllers in `liferay-one-etc-spring-boot`, the service layer and `src/pages/` in `liferay-one-custom-element`) — these change too often for a parallel spec to stay accurate.