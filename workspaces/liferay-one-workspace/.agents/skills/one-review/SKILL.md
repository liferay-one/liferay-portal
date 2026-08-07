---

allowed-tools: [Agent, Bash, Edit, Glob, Grep, Read, Skill, Write]
description: Run a full code review in either lane — formats source, then reviews the diff against the shared review criteria for correctness, concurrency, efficiency, security, and workspace rules. Invoke from the workspace or from the Liferay One scripts repo.
name: one-review

---

# One Review

Run a complete review pass: automated formatting, then the shared review criteria worked against the branch diff, then the automated code review folded in.

What a review covers — the lenses and their weighting, the rule files behind them, the mechanical sweep, the false-positive calibration, the finding format — lives in [`criteria.md`](./criteria.md), not here. This skill is the interactive workflow around it. The `one-team` reviewer charter reads the same file, which is why a finding from either is interchangeable. **New review heuristics go in `criteria.md`.**

## Lanes

Two lanes, one review. Everything lane-specific is in this table; the rest of this file and `criteria.md`'s shared rows apply to both.

| | Workspace lane | Scripts lane |
| --- | --- | --- |
| Reviews | `<WORKSPACE>` — client extensions, objects, site content | `<SCRIPTS>` — `one/` ETL and migration scripts |
| Base ref `<BASE>` | `liferay-one/master-temp` | `liferay-one/main` |
| Step 1 formatter | the `one-format` skill; `one-format --check` under `--read-only` | `bunx prettier --write <touched paths>` then `bun run lint`, from `<TARGET>`; `--check` in place of `--write` under `--read-only` |
| Step 3 criteria rows | the workspace-tagged rows | the scripts-tagged rows |
| Step 4 blast radius | trace into `<WORKSPACE>`, then into `<SCRIPTS>/one/` for anything crossing the contract | trace into `<SCRIPTS>`, then into the workspace's batch definitions and Spring Boot controllers |
| Step 5 automated pass | run `/code-review` | skipped — `criteria.md` explains why the skill does not fit this lane |
| Step 6 learn | the `one-review-learn` skill | the same skill, read from `<WORKSPACE>`, encoding into `<SCRIPTS>/.agents/rules/` and its ESLint config |

**The invoking directory is the lane.** A session rooted anywhere inside the `scripts` checkout is the scripts lane; one rooted inside `liferay-one-workspace` is the workspace lane. That is the default and needs no confirmation. `criteria.md` is read in place from `<WORKSPACE>` in both lanes, like the rule files — resolve `<WORKSPACE>` as `workspaces/liferay-one-workspace` inside a sibling `liferay-portal` checkout, conventionally `../liferay-portal/workspaces/liferay-one-workspace` from the scripts repo's root, and confirm it by finding `client-extensions/liferay-one-batch/batch/` beneath it.

A diff that reaches outside `<TARGET>` is a blocker in both lanes, per `criteria.md`.

## Flags

- `--read-only` — review everything, change nothing on disk. Formatting is still verified, through the lane's check-only command rather than by fixing it; Step 6 is skipped because it writes; `/code-review` runs plain. Every check still runs, so coverage is identical — only the writing stops. Use it when something else owns the formatter, or when the caller is bound by a read-only rule; the `one-team` reviewer is, and this flag is what lets it run this skill.
- `--fix` — apply all safe corrections automatically (format + lint + code-review fixes)
- `--comment` — post review findings as inline GitHub PR comments. In the workspace lane this passes through to `/code-review`; in the scripts lane there is no automated pass to carry it, so post the findings directly. Validate every anchor against the PR head before posting — a comment on a line the diff never touched reads as a false positive.
- `--effort <low|medium|high|xhigh|max>` — passed through to `/code-review` (default: `medium`); no effect in the scripts lane

`--read-only` contradicts `--fix` and `--comment`. When they arrive together, stop and ask which was meant rather than guessing.

## Step 1: Format

Run the lane's Step 1 command from the Lanes table.

Under `--read-only`, run the check-only form. It is the non-mutating counterpart of every formatter step, so compliance is fully verified and nothing is written. Each violation becomes a finding under the Repo rules lens — report them, do not fix them, and do not re-run the mutating formatter to "confirm."

Otherwise run the mutating form. If formatting fails, stop and report the error — do not review on a broken formatter pass.

A lint or formatter failure the diff did not introduce is not a finding. Confirm it by running the same command at `<BASE>` before reporting it; when it fails there too, say so plainly and move on.

## Step 2: Establish the Diff

```bash
BASE=$(git merge-base HEAD <BASE>)

git diff "${BASE}...HEAD" --name-only
git diff "${BASE}...HEAD"
```

Include uncommitted work when there is any — `git diff HEAD` and `git diff --cached`. Staged-but-uncommitted is a normal shape, not an edge case: a `one-team` run reaches review with everything staged and nothing committed, so `${BASE}...HEAD` is empty there and `git diff --cached` is the whole change. If every one of them is empty, or the base is ambiguous, stop and ask rather than guessing.

Reviewing a pull request rather than the local branch: fetch its head into a worktree and read the diff there. A review that runs against the local checkout while reasoning about a remote PR reads the base and reports fixed code as broken.

Read the diff in full and note what kind of change it is: feature, refactor, fix, or deletion. Then read enough surrounding context per changed file to judge it — the rest of the class, the callers, the tests. Read what the lenses need, not the whole subsystem.

## Step 3: Work the Criteria

Read [`criteria.md`](./criteria.md) and work it end to end against the diff: the lane's rule files, then every lens in its order, then the mechanical sweep. Apply the rows tagged for this lane and skip the other lane's. Regression risk is the one lens Step 4 owns instead — it reaches outside the diff, so it gets its own pass rather than a paragraph of attention here.

Under roughly two hundred changed lines, work the lenses inline — every subagent re-reads the diff and the rule files, so a fan-out on a small diff costs more than it saves. Past that, group the lenses into a handful of `sonnet` subagents rather than one per lens — correctness with concurrency, efficiency with architecture, security on its own, rules with simplicity — and put the mechanical sweep on `haiku`. Give each the diff scope, its lenses, and the rule files behind them; set the model explicitly on every `Agent` call. Verification and the final judgment stay in this session.

Cross-repo consistency is a lens, not an afterthought: verify every ERC, field name, endpoint path, and payload shape the diff touches against the other repo, per that lens in `criteria.md`.

## Step 4: Blast Radius

The diff is the trigger for this step, not its boundary. Work the Regression risk lens in `criteria.md` as its own pass — it is the one lens whose whole subject is code the diff never touched, so a review that folds it into reading the diff has already skipped it.

**This step runs on every review, at any diff size.** The Step 3 size heuristic governs how the *lens* work is split; it does not apply here. A one-line change to a shared method has a larger blast radius than a two-hundred-line change to a leaf file, so the diff's size predicts nothing about the size of this step.

1. **Build the symbol list.** From the diff, enumerate everything it changes, renames, or deletes that anything else could reference — signatures, exported components and hooks, service methods, REST paths and payload shapes, shared types, object and field ERCs, list-type values, config keys, environment variables, local-store columns. A symbol that is genuinely private to a single file drops off the list here, and that judgment is worth stating rather than assuming.

1. **Find every reference.** Grep each symbol across `<TARGET>` and across the other repo per the Lanes table — by identifier and by string form both, since ERCs, endpoint paths, and dynamic keys never appear as identifiers. This is pure search, so fan it out: one `haiku` subagent per group of symbols, issued in a single message so they run concurrently, each returning `file:line` references and nothing more. Do not ask a subagent whether a call site is broken — that judgment stays here.

1. **Read the call sites and judge them.** Against the new behavior, not the old, with `criteria.md`'s hardest-first list in hand — behavior changed behind an unchanged signature, parameters reordered where the types still line up, a newly nullable return, a caller's `catch` that no longer matches. Where the references are many, group them by calling module and hand each group to a `sonnet` subagent with the old and new behavior spelled out and a bounded deliverable; verify anything it returns yourself before it becomes a finding.

1. **Report the coverage.** Which symbols were traced, how many references each had, and which call sites were read — even when nothing was found. An unstated trace is indistinguishable from one that never happened.

Set the model explicitly on every `Agent` call. When the session cannot spawn subagents, do the tracing inline and say so; never drop the step for lack of a fan-out.

## Step 5: Automated Code Review

Workspace lane: run the automated pass as `criteria.md` describes, passing any `--fix`, `--comment`, and `--effort` flags through to `/code-review`. Under `--read-only` the invocation is plain apart from `--effort`.

Scripts lane: skip it, per the Lanes table.

## Output

One consolidated report, using the severity tags and finding format from `criteria.md`. Omit any section with no findings.

```
## Format
PASS — no changes needed
(or) Applied N changes; N lint violations remain (rule + file for each)
(or, read-only) CHECKED — N violations, nothing written (rule + file for each)

## Findings
Grouped by lens, in the criteria.md order — rule violations and verified
/code-review hits included under their lens, never in sections of their own.

## Blast radius
Each traced symbol, its reference count, and what was read. Stated even
when it found nothing; findings themselves go under Regression risk above.

## Mechanical
Identifier typos, string typos, then whitespace grouped by type

## Verdict
APPROVED | CHANGES_REQUESTED — one line of reasoning
```

If `--fix` ran, say which fixes were applied automatically and which need a human.

## Step 6: Learn

Skip under `--read-only` — it writes rule files and memory, and a review whose findings are not yet adjudicated has nothing settled to harvest. Whoever owns the change runs it once the dust clears.

Otherwise invoke the `one-review-learn` skill, encoding into the lane's rule files per the Lanes table. It harvests correction patterns from this session — uncommitted changes, recent commits, PR comments — and encodes them as durable guardrails so the same issues do not recur.