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

1. **Concurrency** — the lens local testing cannot cover, so it falls entirely to the reviewer; weight it heaviest on Java changes. `concurrency.md` is the checklist: singleton beans, the three sanctioned shapes for post-startup mutable state, formatter fields, check-then-act, React effect races. Four shapes worth naming because they read as ordinary code: a `HashMap` or `ArrayList` held as a shared field where a concurrent collection belongs; a double-checked lock whose guarded field is not `volatile`, which publishes a half-built object; `count++` on a shared field where an `AtomicLong` belongs; and a React effect or callback whose dependency array is incomplete, so it captures the first render's values forever. Anything reached from a `@Scheduled` tick, an `@Async` method, a startup warm-up, or a Pub/Sub subscriber is concurrent even when only one endpoint writes it. Scripts lane: single-threaded — reduces to unawaited promises and shared mutable module state across a paginated run.

1. **Efficiency** — `data-access.md` is the checklist: service calls in loops, a page fetched to take `[0]`, per-iteration re-derivation, unbounded pagination, serial awaits. Heaviest in the scripts lane, where the same shape runs over hundreds of thousands of records.

1. **Completeness** — every stated acceptance criterion is implemented, and tested; nothing implemented that the ticket did not ask for. In a `one-team` run the criteria are `plan.md` and the evidence is `test-report.md`. A missing test is a finding only where the surrounding code has a test pattern to follow — the scripts repo has none, so it is never a finding there.

1. **Security** — endpoints carry the right OAuth2 scopes (the extension's `client-extension.yaml`); no IDOR through an ERC or ID parameter taken from the request; permission checks before the mutation, not after; no path traversal through a user-supplied filename, no redirect to an unvalidated URL; no secrets, tokens, or personal data in code, config, or log output; nothing arriving from outside gets deserialized into a live object graph. **Injection is a blocker wherever a value is pasted into a query instead of bound to it** — an OData filter built by concatenating a request value rather than through `SearchBuilder`, or a local-store statement built by interpolating into its SQL rather than binding a `$parameter`, which is what every store under `one/scripts/local-store/` already does. Workspace lane: `dangerouslySetInnerHTML` on anything sourced from Salesforce, Jira, Koroneiki, or Marketplace is the primary XSS vector — default JSX interpolation is safe. Scripts lane, each one a blocker: a write path missing `confirmRemoteEnvironment()`, a hardcoded host or credential, a sensitive file in the diff (`sensitive-data.md` has the list).

1. **Regression risk — the blast radius, not just the diff.** The diff is where a review starts, never where it ends. The defect a diff-scoped read misses lives in a file the diff never touched, in code that still compiles and still looks correct on its own. Work this as an explicit pass, not as a thought while reading the diff.

	Enumerate every symbol the diff changes, renames, or deletes — function and method signatures, exported components and hooks, service methods, REST paths and payload shapes, shared types, object and field ERCs, list-type values, config keys, environment variables, local-store columns. Find every reference to each, across `<TARGET>` and the consuming repo both, and **read each call site against the new behavior**. A symbol whose references were never read is an open finding, not a silent pass: name in the report which symbols were traced and how many references each had. This is the lens that most repays a fan-out, and the skill's blast-radius step is where that happens.

	What to look for at each site, hardest to catch first:

	- **A behavior change behind an unchanged signature.** The method now returns `null` where it threw, an empty page where it returned every row, writes a second record, or narrows a filter. Nothing mechanical catches this — every call site still compiles and every existing test still passes. It is the most valuable thing this lens finds.
	- **Parameters added or reordered while the types still line up.** The compiler stays quiet and the arguments land in the wrong parameters. `code-style.md` mandates alphabetical parameters, so any rename that re-sorts a signature reaches this routinely. Read each call site; a green build proves nothing here.
	- **A widened or newly nullable return** that an existing caller dereferences unguarded, and a thrown exception type that a caller's `catch` no longer matches.
	- **References no symbol-name grep will find** — ERCs and field names in batch object definitions, site-initializer JSON, FreeMarker templates, dynamic string keys, endpoint paths assembled from fragments, OAuth2 scope strings. Search the string form as well as the identifier.
	- **A deletion whose callers outlived it**, and a shared component whose prop keeps its name while its meaning changes.

	Ordering counts as much as call sites: a change to when something runs, how often, or what it leaves behind on a second pass is a regression even when every signature holds.

1. **Cross-repo consistency** — the product and the scripts that load its data share one contract: ERCs, field names, endpoint paths, payload shapes. Workspace lane: grep every value the diff changes against `<SCRIPTS>/one/`; a break is owed work in a companion ticket, never fixed in this diff. Scripts lane: verify every value the diff writes against the object definitions (`client-extensions/liferay-one-batch/batch/`) and the `liferay-one-etc-spring-boot` controllers — never against a spec, since nothing under `.agents/` is authoritative. An invented or stale ERC is a blocker: it silently loads orphaned data.

1. **Architecture and pattern conformance** — the code mirrors the patterns already there; where the surrounding code does X, introducing Y needs a stated reason. Workspace lane: objects and ERCs come from the batch definitions, service files map to the URL they call, pages follow the existing router split. Scripts lane: the three-layer rule and the two script patterns per `architecture.md` and `script-conventions.md` — a skipped layer is a finding. In either lane a hand-edit to generated output is a blocker: the generator overwrites it on the next run, so the change has to go to whatever the generator reads, or to the code that calls it.

1. **Repo rules** — everything the lane's style rules mandate: `code-style.md` and `naming.md` in the workspace (sorted entries, log conventions, wording, casing, file naming); `no-comments.md` and `script-conventions.md` in the scripts repo (any comment in new or modified code, `console.log`, a hand-written OData filter, a Liferay call outside `liferay-headless-rest-client`). Three more the rule files do not state: the Liferay clients in `services/liferay.ts` already retry transient failures at the ky layer, so a manual retry loop wrapped around one of their calls is a finding; batch-engine `failedItems[].itemIndex` is **1-based**, so mapping it back to the submitted array reads `array[itemIndex - 1]`; and every store under `one/scripts/local-store/` builds its schema with `CREATE TABLE IF NOT EXISTS` against a `.db` file that already exists on disk, so a column added to that DDL never lands on an existing store — a new column needs an explicit `ALTER TABLE` migration, and a reviewer who sees only the DDL edit is looking at a silent no-op.

1. **Simplicity and maintainability** — dead code, needless abstraction, duplicated logic, narrative comments, a method doing too many things; names that say nothing (`temp`, `data`, `obj`) outside tiny scopes, or that no longer say what the thing does after a refactor. Also: a value hardcoded where a named constant or config belongs, subject to the calibration in Known False Positives below; a `switch` or `if`-chain that duplicates logic and will break quietly when the next case arrives; three or more near-duplicates asking for one abstraction; and a signature so specific that every caller has to restructure around it. Flag complexity the next reader will pay for. Suggest direction; do not write the refactor.

A diff that reaches outside its target repo is a blocker in both lanes, filed under whichever lens explains why it got there.

## Mechanical Sweep

Prettier in the workspace covers only `liferay-one-custom-element/src/**/*.{ts,tsx,css}` and its `@vite/**/*.ts`. Everything else went through no whitespace formatter at all — batch object definitions, site initializer JSON and FreeMarker, `client-extension.yaml` files, global CSS, `.properties`, and Markdown. That gap is where this sweep pays off, so scope it to the changed files outside the Prettier paths.

It is pure pattern matching, so it is the one part of a review worth handing to a `haiku` subagent:

- Trailing whitespace, spaces and tabs in one pass: `grep -nE "[[:blank:]]+$"`. Use this form rather than `grep -P`, which the BSD grep on macOS does not support and which therefore fails depending on which grep is first on `PATH`.
- More than one consecutive blank line
- Mixed tabs and spaces against the file's own convention
- Double spaces mid-line, outside a deliberately aligned block or a string literal
- A blank line at the top of a file, and a missing final newline on anything but Markdown
- Misspellings in identifiers, which outlive everything else once merged
- Misspellings in user-visible strings, language keys, log messages, and comments
- Identifier casing against the file's own convention — `camelCase` for variables, methods, and fields, `PascalCase` for types and classes, `UPPER_SNAKE_CASE` for constants, and the `_` prefix on private fields wherever the surrounding file already uses it

Report identifier and string typos separately from whitespace — the first two are worth fixing individually, the third is bulk.

Match the file, not a general rule. Where the existing file indents with tabs, or prefixes its private fields, new code does the same; a "convention violation" that is really the file's own settled style is a false positive.

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

Every finding cites a `file:line` and is verified against the actual code before it is written up. Automated output — from `code-review` or any subagent — is a candidate list, not findings; only what survives verification gets a tag. The `fix:` line is a direction, not a patch: name the approach and leave the implementation to whoever owns the change.

Keep the report short — most good reviews fit on a page — and never echo the diff back, since the reader already has it. The one thing worth stating even when it found nothing is the blast-radius coverage: which symbols were traced and how many references each had. "Traced, nothing found" and "never traced" take the same space on the page and mean opposite things.

`APPROVED` requires zero open findings of any severity, nits included. Anything else is `CHANGES_REQUESTED`.