---

allowed-tools: [AskUserQuestion, Bash, Glob, Grep, Read]
description: Create a GitHub pull request for the current branch, transition the corresponding Jira ticket to review, and record the PR link on the ticket. Use when the user asks to create a PR, send a PR, or invokes /pr.
name: one-pr

---

# Create a Pull Request

Create a GitHub pull request against `liferay-one/liferay-portal`, transition the linked Jira ticket to review, and record the pull request URL on that ticket.

## Preconditions

- The current branch is a development branch, not `master` or any other protected branch.

- The working tree has no uncommitted changes. When dirty, abort and ask the user to commit first (suggest `/commit`); do not stash or discard their work.

## Pre-flight Checks

Before creating the PR, verify these Brian-enforced requirements:

**Scope:** Run `git diff liferay-one/master-temp --name-only` and confirm all changed files belong to the workspace for this ticket. If files from another workspace (e.g., `clarity-solution-workspace`) appear, abort and ask the user to remove them.

**Commit messages:** Confirm every commit on the branch has a valid Jira ticket prefix (`LPD-`, `LRSD-`, `LCD-`, etc.). The CI bot auto-closes PRs missing a ticket reference.

**Merge conflicts:** Confirm the branch is rebased on top of `liferay-one/master-temp` with no conflicts. Run `git merge-base --is-ancestor liferay-one/master-temp HEAD` — if the branch is behind, offer to run `/one-rebase` first.

**Code review:** Report what review the branch has, recommend one when it is missing, and let the author decide. This check pauses for a question; it never holds the pull request against an answer.

Both halves matter. A check that cannot pause is worthless — an unreviewed branch should hear about it before it goes out. A check that can veto is worse than worthless: every fix is a new commit, every new commit outdates the receipt, and the next review reads the fix and finds something in it, so the rounds compound and the branch drifts past the ticket it was opened for. One question, then the author's word is final in either direction. Opening the pull request is not the end of review; the comments on it are the other half.

Look for either signal:

1. A `one-review` receipt — for `HEAD` first, then for the branch's own commits:

	```bash
	RECEIPTS="$(git rev-parse --path-format=absolute --git-common-dir)/one-review/receipts"

	cat "${RECEIPTS}/$(git rev-parse HEAD)" 2>/dev/null ||
		for SHA in $(git log --format=%H liferay-one/master-temp..HEAD); do
			[ -f "${RECEIPTS}/${SHA}" ] &&
				echo "receipt on ancestor ${SHA}" &&
				cat "${RECEIPTS}/${SHA}" &&
				break
		done
	```

	`--path-format=absolute` matches the form the receipt is written with. A bare `--git-common-dir` returns a path relative to the current directory — `.git` at the repo root, `../../.git` from a subdirectory — which is correct only while the shell stays where it was computed. Capture it and `cd`, or reuse it a step later, and it quietly resolves somewhere else and the receipt reads as missing.

1. A `one-team` review artifact for this ticket — `.one-team/<TICKET>/review.md` at the repo root. That protocol gates its own commits on the reviewer's `APPROVED`, so its presence is evidence for the branch as committed. Its presence is the signal; where that run used `--adversarial` it also carries an Independence line in place of a receipt, since the reviewer runs `--read-only`, and that is worth naming in the summary.

Name the state in a sentence or two — a note, not a report:

- **A receipt for `HEAD` reading `verdict: APPROVED` and `tree: clean`, or a `one-team` artifact** — reviewed. Say so and carry on without asking.
- **A receipt on an ancestor** — reviewed at that commit, with the later ones not covered. List them with `git log --oneline <receipt-commit>..HEAD`. This is the ordinary state of a branch that has had review fixes applied, not a problem in itself.
- **`verdict: CHANGES_REQUESTED`, or `tree: dirty`** — the review had open findings, or it covered a working tree rather than a commit. Say which, and name the findings if the receipt carries them.
- **Neither signal** — the branch has never been reviewed. This is the one case that earns a real recommendation: `/one-review` before it goes out.

In every case but the first, **do not push, do not open the pull request, and do not transition the Jira ticket yet.** Ask once, with `AskUserQuestion`, offering these two in this order:

1. **Run `/one-review` first** — the recommendation, and the first option every time. Stop the run here, and hand it back so they can invoke `/one-review` themselves.

1. **Open the pull request anyway** — proceed to everything below, Jira transition included.

Nothing goes out on a default or a shrug. The pull request is opened only when the author picks it, either at that question or by saying so afterward.

**And a follow-up settles it.** When the run stopped for a review and the author comes back — in this turn or a later one — saying to send it, that is the answer: open the pull request. Do not ask a second time, do not re-raise the findings, do not ask them to run the review first, and do not treat an open finding of any severity as a veto. They were told what the branch is missing; choosing to send it anyway is theirs to make, and an unreviewed pull request is an ordinary thing to open.

Never run `/one-review` from inside this skill, with or without permission. This skill reads the record and reports it; it is not the review, and running one here is precisely what turns opening a pull request into another round.

However the review was run, it is read the same way. `--adversarial` is an optional escalation for changes that warrant it, never the bar — a standard review is exactly as valid a signal, and a receipt without a `mode` line (or with `mode: standard`) is not a lesser one. Note the `mode` in the summary because it is worth knowing, and do not offer to re-run anything: the user asking for a PR has already decided how much review this change warranted.

**Ticket scope.** Findings are not a queue to be drained before this skill may push. What belongs on the branch is what the ticket asked for; a finding outside that is owed work for a companion ticket — record it, leave it. A pull request that grew past its ticket to satisfy a review is a harder pull request to review, not a safer one.

## Input

### Branch

The current Git branch must contain the commits ready to ship.

### Jira Ticket

Resolve a ticket key in priority order:

1. **Branch Name** — extract the ticket from the current branch (e.g., branch `LRSD-12299` yields `LRSD-12299`).

1. **Recent Commits** — when the branch name yields nothing, scan recent commit messages for a ticket prefix.

1. **Fallback** — when nothing surfaces, prompt the user.

The ticket key follows the pattern `LPD-12345` or similar (uppercase letters, hyphen, digits).

### Target Repository

Always `liferay-one/liferay-portal`. The pull request head is `<github-username>:<branch-name>` (read the GitHub username from the user's `origin` remote URL) and the base is `master-temp`.

## Expected Output

### Pushed Branch

Push the current branch to the user's remote when it has not been pushed yet or when new local commits exist.

### Pull Request

The title is concise (under 72 characters) and prefixed with the Jira ticket:

```
LPD-12345 Fix something in liferay-one
```

The body follows this format:

```markdown
https://liferay.atlassian.net/browse/TICKET-ID

## What is being fixed

Explain the problem or bug that motivated the change — what was going
wrong or what was missing.

## How it is being fixed

Explain the approach taken across all commits. Describe the key changes
and the reasoning behind the approach. Write in plain prose rather than
bullet points.
```

Present the proposed title and body to the user before submitting, and proceed once they approve.

### Transitioned Jira Ticket

Fetch the input ticket (issue type, status, subtasks) and resolve the **target ticket** — the one whose status reflects active work and on which the pull request URL is recorded:

| Ticket Type | Target |
| --- | --- |
| Bug (`10004`) | The bug itself |
| Task (`10002`) | Its Technical Task (`10153`) subtask |
| Technical Task (`10153`) | Itself |

When the target is not already in an in-progress status, transition it first:

| Target Type | Destination | Transition ID |
| --- | --- | --- |
| Bug | In Progress | `61` |
| Technical Task | In Progress | `41` |

Then transition it to review:

| Target Type | Destination | Transition ID |
| --- | --- | --- |
| Bug | In Review | `71` |
| Technical Task | In Peer Review | `31` |

When the review transition fails (for example, because the ticket is already in a later status), still proceed to record the pull request URL.

Set the **Git Pull Request** field (`customfield_10201`) on the target ticket to the new pull request URL.

### Summary

Report back to the user with:

- The Jira ticket status and link.
- The pull request URL.
- The review state the pull request went out under — the receipt's commit and verdict, the `one-team` artifact, or that the branch was unreviewed and the author chose to send it anyway. One line, stated the same way in every case: this is a record, not a warning, and nothing here is a mark against the pull request. Name the receipt's `mode` next to its verdict when it carries one, and under `adversarial` the `independence` and `reading` beside it.