---

allowed-tools: [Agent, Bash, Edit, Glob, Grep, Read, Skill, Write]
description: Run a full code review for this workspace — formats source, then reviews the diff against the shared review criteria for correctness, concurrency, efficiency, security, and workspace rules.
name: one-review

---

# One Review

Run a complete review pass: automated formatting, then the shared review criteria worked against the branch diff, then the automated code review folded in.

What a review covers — the lenses and their weighting, the rule files behind them, the mechanical sweep, the false-positive calibration, the finding format — lives in [`criteria.md`](./criteria.md), not here. This skill is the interactive workflow around it. The `one-team` reviewer charter reads the same file, which is why a finding from either is interchangeable. **New review heuristics go in `criteria.md`.**

## Flags

- `--read-only` — review everything, change nothing on disk. Formatting is still verified, through `one-format --check` rather than by fixing it; Step 5 is skipped because it writes; `/code-review` runs plain. Every check still runs, so coverage is identical — only the writing stops. Use it when something else owns the formatter, or when the caller is bound by a read-only rule; the `one-team` reviewer is, and this flag is what lets it run this skill.
- `--fix` — apply all safe corrections automatically (format + lint + code-review fixes)
- `--comment` — post review findings as inline GitHub PR comments
- `--effort <low|medium|high|xhigh|max>` — passed through to `/code-review` (default: `medium`)

`--read-only` contradicts `--fix` and `--comment`. When they arrive together, stop and ask which was meant rather than guessing.

## Step 1: Format

Under `--read-only`, invoke `one-format --check`. It runs the non-mutating counterpart of every formatter step, so compliance is fully verified and nothing is written. Each violation becomes a finding under the Repo rules lens — report them, do not fix them, and do not re-run the mutating formatter to "confirm."

Otherwise invoke the `one-format` skill. If formatting fails, stop and report the error — do not review on a broken formatter pass.

## Step 2: Establish the Diff

```bash
BASE=$(git merge-base HEAD liferay-one/master-temp)

git diff "${BASE}...HEAD" --name-only
git diff "${BASE}...HEAD"
```

Include uncommitted work when there is any — `git diff HEAD` and `git diff --cached`. Staged-but-uncommitted is a normal shape, not an edge case: a `one-team` run reaches review with everything staged and nothing committed, so `${BASE}...HEAD` is empty there and `git diff --cached` is the whole change. If every one of them is empty, or the base is ambiguous, stop and ask rather than guessing.

Read the diff in full and note what kind of change it is: feature, refactor, fix, or deletion. Then read enough surrounding context per changed file to judge it — the rest of the class, the callers, the tests. Read what the lenses need, not the whole subsystem.

## Step 3: Work the Criteria

Read [`criteria.md`](./criteria.md) and work it end to end against the diff: the lane's rule files, then every lens in its order, then the mechanical sweep. This lane is **workspace**, so apply the workspace-tagged rows and skip the scripts-lane ones.

Under roughly two hundred changed lines, work the lenses inline — every subagent re-reads the diff and the rule files, so a fan-out on a small diff costs more than it saves. Past that, group the lenses into a handful of `sonnet` subagents rather than one per lens — correctness with concurrency, efficiency with architecture, security on its own, rules with simplicity — and put the mechanical sweep on `haiku`. Give each the diff scope, its lenses, and the rule files behind them; set the model explicitly on every `Agent` call. Verification and the final judgment stay in this session.

## Step 4: Automated Code Review

Run the automated pass as `criteria.md` describes, passing any `--fix`, `--comment`, and `--effort` flags through to `/code-review`. Under `--read-only` the invocation is plain apart from `--effort`.

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

## Mechanical
Identifier typos, string typos, then whitespace grouped by type

## Verdict
APPROVED | CHANGES_REQUESTED — one line of reasoning
```

If `--fix` ran, say which fixes were applied automatically and which need a human.

## Step 5: Learn

Skip under `--read-only` — it writes rule files and memory, and a review whose findings are not yet adjudicated has nothing settled to harvest. Whoever owns the change runs it once the dust clears.

Otherwise invoke the `one-review-learn` skill. It harvests correction patterns from this session — uncommitted changes, recent commits, PR comments — and encodes them as durable guardrails so the same issues do not recur.