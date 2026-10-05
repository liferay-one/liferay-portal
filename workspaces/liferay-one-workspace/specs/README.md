# Specs

This directory records what Liferay One must do and how it is built. The test plan in [`../tests/plan/`](../tests/plan/) records what each piece of code does. A requirement here links to the plan items that prove it.

| Directory | Question | Organized By | ID |
| --- | --- | --- | --- |
| [`business/`](./business/) | What must the system do, and for whom? | Feature area | `REQ-<AREA>-<NNN>` |
| [`technical/`](./technical/) | Which technical rules apply to every feature, how is the system built, and what does it exchange with external systems? | Quality attribute, component, and external system | `TECH-<AREA>-<NNN>` |

[`glossary.md`](./glossary.md) defines the terms that both directories use. When a file and the glossary disagree, the glossary is correct.

A file holds requirement rows, prose, or both. Requirement rows are checked by `yarn plan:check`. Prose, such as [`technical/data-model.md`](./technical/data-model.md), is not checked. When prose and the code disagree, the code is correct and the prose is stale.

## Traceability

Links point up, from the code to the intent:

```
tests ──cover──▶ plan items ◀──Verified By── REQ and TECH rows
```

A requirement does not cite another requirement. A business requirement and a technical requirement are proved separately, by the plan items that each one cites.

## Row Schema

Each requirement file has a short introduction, a list of terms, and one table for each section. Every table uses this header:

```
| ID | Requirement | Priority | Tickets | Verified By |
```

- **ID**: `REQ-<AREA>-<NNN>` in `business/`, and `TECH-<AREA>-<NNN>` in `technical/`. Each file uses one area code, and no two files share a code. Number in blocks of ten for each section so that a new requirement fits next to its neighbors. Do not change or reuse an ID.
- **Requirement**: the rule, in [Simplified Technical English](../.agents/rules/simplified-technical-english.md). Say what the system must do, not how the code does it.
- **Priority**: `P0` for money, access, identity, or data integrity. `P1` for core behavior. `P2` for polish.
- **Tickets**: the Jira keys that define or change the rule, or `—`.
- **Verified By**: plan IDs in backticks, separated by commas, or `—`. Cite the plan items whose tests prove the rule. Do not cite an `n/a` plan item, because no test proves it. A requirement with `—` is unverified. `checkPlan` counts it but does not fail.

## Checks

The scripts check traceability in both directions:

| Command | Direction | What It Does |
| --- | --- | --- |
| `yarn plan:check` | Requirement to plan | Fails when a requirement cites a plan ID that does not exist or an `n/a` plan item, or when its ID prefix does not match its directory. |
| `yarn plan:check` | Plan to requirement | Fails when the share of traceable plan items that a requirement cites drops below the `--min-traced` floor. An `n/a` row is not traceable. |
| `yarn plan:coverage --list` | Plan to requirement | Shows traceability for each plan file and names every untraced item. |
| `yarn plan:report` | Requirement to tests | Marks each requirement as verified, partial, or unverified, and adds a Requirements column to each plan table in the report. |

Run the commands from `tests/`.

## Adding an Area

1. Create `<area>.md` in `business/` or `technical/`, and pick an area code that no other file uses.

1. Write the requirements from the code, the Jira stories, and the plan rows of that area.

1. Cite the plan IDs that prove each requirement.

1. Run `yarn plan:check`.

1. Raise the `--min-traced` floor of `plan:check` in `tests/package.json` to the new traced percentage, rounded down.

When no plan item proves a requirement, write `—`, or add a `spec:` row to [`../tests/plan/flows.md`](../tests/plan/flows.md) and cite it.