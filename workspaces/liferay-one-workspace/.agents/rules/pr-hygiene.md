# PR Hygiene

These rules come directly from Brian's PR feedback. Violations result in immediate rejection.

## Scope: One Workspace, One PR

A PR must not touch files from a workspace other than the one the ticket describes. Brian explicitly rejected a PR for including `clarity-solution-workspace` changes in what should have been a `liferay-one-workspace`-only PR.

Before sending a PR, verify:

```bash
git diff origin/master-temp --name-only
```

If any files outside the intended workspace appear, remove them before sending.

## No Merge Conflicts

Never send a PR that has merge conflicts. Brian immediately closes them with the comment "conflicts". Rebase or merge first, verify the branch is clean, then resend.

## Reference Upstream Merges

When your work depends on a PR that was already merged upstream by Brian, your PR must include or reference those merged commits. If Brian merged a dependency, rebase onto the latest `liferay-one/master-temp` before sending your PR so the upstream commits are included.

## Commit Messages Must Have a Jira Ticket

Every commit message must reference a valid Jira ticket (LPD-12345, LRSD-12345, etc.). The CI bot automatically closes PRs where any commit is missing this reference.

Valid prefixes: `BLADE`, `CLDSVCS`, `COMMERCE`, `IDE`, `ISOPS`, `ISSD`, `ISSUP`, `LCD`, `LOOP`, `LPD`, `LPS`, `LRAC`, `LRCI`, `LRDOCS`, `LRIS`, `LRQA`, `LRSD`, `OAUTH2`, `POSHI`, `RELEASE`, `SYNC`, `TR`.

## One Ticket Per PR

PRs should address a single Jira ticket. If your fix actually addresses a different problem from the stated ticket, use the correct ticket or create a new one.

## Tests Go in Their Own Commit

A branch that changes behavior has at least two commits. The first commit holds the code. The next commit holds the tests for that code. Do not put a test file in the code commit, and do not put a source file in the test commit.

A test file is one of these:

- A Vitest file, `*.test.ts` or `*.test.tsx`, in a client extension.
- A JUnit file under `src/test/` in a client extension.
- Any file under `tests/`, which includes the Playwright specs, their utilities, and the `tests/plan/*.md` rows.

The `specs/` files are requirements, not tests. Put a `specs/` change in the code commit.

Title the test commit for the behavior that it proves, for example `LPD-12345 Test that a cloud contact designation stays on its own project`. A test commit has no body unless the title does not explain the change.

Run this check before you send the PR. It prints each commit that mixes test files and other files:

```bash
for SHA in $(git rev-list liferay-one/master-temp..HEAD); do
	FILES=$(git show --format= --name-only --relative "${SHA}")
	TESTS=$(echo "${FILES}" | grep --count --extended-regexp '\.test\.tsx?$|/src/test/|^tests/')
	TOTAL=$(echo "${FILES}" | grep --count .)

	if [[ ${TESTS} -gt 0 && ${TESTS} -lt ${TOTAL} ]]; then
		git log --format='%h %s' -1 "${SHA}"
	fi
done
```

To split a mixed commit, reset it with `git reset --soft HEAD~1`. Unstage the test files and commit the code with the original message. Then stage only the test files and commit them. Stage files by name, not with `git add -A`, because the working tree can hold edits that do not belong to either commit.

## Keep the Visuals Current

The pages in `tools/visuals/` are built from the code, and some of their input is written by hand: object domains, audit findings, the order to entitlement narrative, and the endpoints flagged by the audit. A change to the code can make that input wrong. `yarn viz:check` finds each place.

Run `yarn viz:check` before you send the PR. It must exit 0. These changes are the usual cause of a problem:

| Change | File to update |
| --- | --- |
| Add, rename, or remove an object, field, or relationship in `liferay-one-batch/batch/` | `tools/visuals/object-model/config.json` and `findings.json` |
| Fix a defect that an object model finding describes | The finding's `sev` in `tools/visuals/object-model/findings.json` |
| Change a grant in `resource-permissions.json`, or add a role | `tools/visuals/permission-matrix/config.json` |
| Change a sidecar endpoint path, or a route or service in the custom element | `tools/visuals/apis/config.json` |

A problem can also report a real defect in the code, such as an object action with no handler. Fix the defect, or add it to `tools/visuals/known-defects.json` with its ticket or audit ID. Do not change an extractor to hide a problem. When you fix a known defect, remove its entry, because the check fails on an entry that no longer matches.

Put the visual update in the same commit as the code that caused it. The check needs no running portal.