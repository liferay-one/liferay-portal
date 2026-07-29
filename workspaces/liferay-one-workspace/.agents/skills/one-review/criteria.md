# Review Criteria

What a Liferay One review covers, in both lanes: the lenses to apply and their weighting, what does not count as a finding, and how a finding is written up. Every reviewer reads this file — the interactive `/one-review` skill and the `one-team` reviewer charter (`../one-team/roles/reviewer.md`) both work from it, so a finding from either means the same thing. Review logic belongs here and nowhere else; a new heuristic gets added to this file, not to a caller.

Lane is either **workspace** (`liferay-one-workspace` — client extensions, objects, site content) or **scripts** (the sibling `liferay-one/scripts` checkout — `one/` ETL and migration scripts). Where a lens reads the same in both, it is untagged.

## Rule Files

Read the lane's rule files first — they carry the detail the lenses below deliberately do not repeat. They are not a separate review pass: a violation is reported under whichever lens caught it.

| Lane | Rule files under `.agents/rules/` |
| --- | --- |
| Workspace | `code-style.md`, `concurrency.md`, `data-access.md`, `naming.md`, `object-naming.md`, `page-folder-structure.md`, `pr-hygiene.md` |
| Scripts | `architecture.md`, `code-quality.md`, `no-comments.md`, `script-conventions.md`, `sensitive-data.md`, plus the workspace's `data-access.md` — the scripts call the same APIs over far more records |

## The Lenses, in Order

The order is the weighting: a concurrency defect outranks a maintainability suggestion, and effort should follow. Where a lens names a rule file, that file is the checklist — the lens adds only the weighting and the judgments the file cannot make.

1. **Correctness** — logic errors, null and error paths, edge cases; silent failures above all: swallowed exceptions, empty catch blocks, a `catch` that logs and returns a default, fail-open authorization, a `?? ''` that masks a missing value. Scripts lane: idempotency is a correctness property — a script that duplicates records or double-counts on a second run is a blocker even when the first pass came back clean, and a swallowed per-item error that leaves data half-loaded is a real defect; a zero exit code proves nothing.

1. **Concurrency** — the lens local testing cannot cover, so it falls entirely to the reviewer; weight it heaviest on Java changes. `concurrency.md` is the checklist: singleton beans, the three sanctioned shapes for post-startup mutable state, formatter fields, check-then-act, React effect races. Scripts lane: single-threaded — reduces to unawaited promises and shared mutable module state across a paginated run.

1. **Efficiency** — `data-access.md` is the checklist: service calls in loops, a page fetched to take `[0]`, per-iteration re-derivation, unbounded pagination, serial awaits. Heaviest in the scripts lane, where the same shape runs over hundreds of thousands of records.

1. **Completeness** — every stated acceptance criterion is implemented, and tested; nothing implemented that the ticket did not ask for. In a `one-team` run the criteria are `plan.md` and the evidence is `test-report.md`. A missing test is a finding only where the surrounding code has a test pattern to follow — the scripts repo has none, so it is never a finding there.

1. **Security** — endpoints carry the right OAuth2 scopes (the extension's `client-extension.yaml`); no IDOR through an ERC or ID parameter taken from the request; permission checks before the mutation, not after; no path traversal through a user-supplied filename, no redirect to an unvalidated URL; no secrets, tokens, or personal data in code, config, or log output. Workspace lane: `dangerouslySetInnerHTML` on anything sourced from Salesforce, Jira, Koroneiki, or Marketplace is the primary XSS vector — default JSX interpolation is safe. Scripts lane, each one a blocker: a write path missing `confirmRemoteEnvironment()`, a hardcoded host or credential, a sensitive file in the diff (`sensitive-data.md` has the list).

1. **Regression risk** — changed signatures, contracts, ERCs, or shared components, checked against their consumers.

1. **Cross-repo consistency** — the product and the scripts that load its data share one contract: ERCs, field names, endpoint paths, payload shapes. Workspace lane: grep every value the diff changes against `<SCRIPTS>/one/`; a break is owed work in a companion ticket, never fixed in this diff. Scripts lane: verify every value the diff writes against the object definitions (`client-extensions/liferay-one-batch/batch/`) and the `liferay-one-etc-spring-boot` controllers — never against a spec, since nothing under `.agents/` is authoritative. An invented or stale ERC is a blocker: it silently loads orphaned data.

1. **Architecture and pattern conformance** — the code mirrors the patterns already there; where the surrounding code does X, introducing Y needs a stated reason. Workspace lane: objects and ERCs come from the batch definitions, service files map to the URL they call, pages follow the existing router split. Scripts lane: the three-layer rule and the two script patterns per `architecture.md` and `script-conventions.md` — a skipped layer is a finding.

1. **Repo rules** — everything the lane's style rules mandate: `code-style.md` and `naming.md` in the workspace (sorted entries, log conventions, wording, casing, file naming); `no-comments.md` and `script-conventions.md` in the scripts repo (any comment in new or modified code, `console.log`, a hand-written OData filter, a Liferay call outside `liferay-headless-rest-client`).

1. **Simplicity** — dead code, needless abstraction, duplicated logic, narrative comments, a method doing too many things; names that say nothing (`temp`, `data`, `obj`) outside tiny scopes, or that no longer say what the thing does after a refactor. Flag complexity the next reader will pay for. Suggest direction; do not write the refactor.

A diff that reaches outside its target repo is a blocker in both lanes, filed under whichever lens explains why it got there.

## Mechanical Sweep

Prettier in the workspace covers only `liferay-one-custom-element/src/**/*.{ts,tsx,css}` and its `@vite/**/*.ts`. Everything else went through no whitespace formatter at all — batch object definitions, site initializer JSON and FreeMarker, `client-extension.yaml` files, global CSS, `.properties`, and Markdown. That gap is where this sweep pays off, so scope it to the changed files outside the Prettier paths.

It is pure pattern matching, so it is the one part of a review worth handing to a `haiku` subagent:

- Trailing whitespace: `grep -n " \+$"` and `grep -nP "\t+$"`
- More than one consecutive blank line
- Mixed tabs and spaces against the file's own convention
- Misspellings in identifiers, which outlive everything else once merged
- Misspellings in user-visible strings, language keys, log messages, and comments

Report identifier and string typos separately from whitespace — the first two are worth fixing individually, the third is bulk.

## Automated Pass

Workspace lane: run the `code-review` skill — the working-diff reviewer, not the plugin that comments on a GitHub PR — with its fan-out on `sonnet`, the model set explicitly on every `Agent` call. The lens work already covers bug scanning and rule adherence; what this pass adds is the history the diff cannot show — git blame on the modified lines, review comments from earlier PRs that touched the same files, guidance in surrounding code comments. Weight its output there, and drop what the lenses already found.

Scripts lane: skip it — the skill is shaped for the workspace. A clean `bun run lint` is a starting point, not a substitute: it says nothing about layering, comments, idempotency, or an invented ERC.

## Known False Positives

Do not report these. Each costs the reader more than it saves, and a wrong finding costs more than a missed one.

- **Java method ordering.** The convention is alphabetical *within* an access-modifier group, not across the file — a `public` method appearing between two `private` ones is correct. `formatSource` enforces it anyway.
- **Anything a formatter, linter, or compiler catches.** Import order, missing imports, type errors, indentation. The build gate covers these; if something remains, say "rerun the formatter" rather than itemizing.
- **Hardcoding that should stay hardcoded.** A JDK or Liferay constant, a well-known enum or protocol string, a small fixed list that rarely changes, or any value where dynamism buys nothing real. Flag hardcoding only when it will plausibly cause pain: a new case is already coming, it differs per environment, or it belongs in a language key.
- **Pre-existing defects on lines the diff never touched**, unless the change newly reaches them.
- **Comment and documentation quality** beyond spelling. A *missing* comment is never a finding — this codebase's default is no narrative comments, and the scripts lane forbids them outright.
- **A Markdown file with no trailing newline.** `MarkdownWhitespaceCheck` in the Liferay source formatter strips it deliberately, so its absence is the convention here, not an oversight.

## Findings

Tag every finding and sort most severe first:

```
[blocker|major|minor|nit] <file>:<line> — <what is wrong>
    why: <consequence, or the rule/pattern file it violates>
    fix: <concrete suggestion>
```

Every finding cites a `file:line` and is verified against the actual code before it is written up. Automated output — from `code-review` or any subagent — is a candidate list, not findings; only what survives verification gets a tag.

`APPROVED` requires zero open findings of any severity, nits included. Anything else is `CHANGES_REQUESTED`.