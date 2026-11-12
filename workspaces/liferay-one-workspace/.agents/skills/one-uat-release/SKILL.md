---

argument-hint: [<yyyy-MM-dd>]
description: Cut a Liferay One release to one-uat. Ask for the release date, create the one-release-<yyyy-MM-dd> branch for that date from the latest liferay-one master-temp and push it, list the commits and Jira tickets since the previous release branch, build and deploy the custom element, Spring Boot, instance settings, and Kong client extensions that the release changes to one-uat in one build, do the manual steps of each ticket, comment on each ticket that it is on one-uat, set the Release Date of each ticket, and test each ticket that can be tested. Use when the user asks to cut, push, or deploy a release to UAT or one-uat, or invokes /one-uat-release.
name: one-uat-release

---

# Release to one-uat

Cut a release branch from `master-temp`, deploy it to one-uat, and record the release on each Jira ticket that it contains.

The user gave permission for this skill to create and push the release branch, to deploy to one-uat, to add Jira comments, and to set the Release Date field without a further question. Manual steps change shared one-uat data, so show them all to the user and get one confirmation before you do them. Ask the user before any other write to one-uat data. Do not change the status or the assignee of a ticket.

## When to Invoke

- "Cut a release", "push a release to UAT", "deploy master-temp to one-uat".
- `/one-uat-release`, optionally with the release date.

## Values

| Name | Value |
| --- | --- |
| `<workspace>` | `$(git rev-parse --show-toplevel)/workspaces/liferay-one-workspace` |
| `<test-ticket>` | `<workspace>/.agents/skills/one-uat-test-ticket` |
| `<scratchpad>` | The session scratchpad directory |
| `<date>` | The release date that the user gives in Step 0, as `yyyy-MM-dd` |
| `<release>` | `one-release-<date>` |
| `<portal>` | The main `liferay-portal` checkout, `$(git rev-parse --show-toplevel)` |
| `<clone>` | `<portal>/../liferay-one-release-deploy`, the clone that Step 4 builds and deploys from |
| `<previous>` | The newest `one-release-*` branch on `liferay-one` before `<release>` |
| Upstream remote | The remote whose URL contains `liferay-one/liferay-portal`, usually `liferay-one` |
| LCP project | `exte5a2oneliferay-extuat` |
| Release client extensions | `liferay-one-custom-element`, `liferay-one-etc-spring-boot`, `liferay-one-instance-settings`, `liferay-one-kong` |
| `<deploy>` | The release client extensions that changed since their last deploy, from Step 4 |

The date in the branch name is year, month, day, as in `one-release-2026-11-10`.

The Release Date field of a ticket is `customfield_10233`, a date field that takes `yyyy-MM-dd`.

Every Jira call is a `curl` call with `--user "${JIRA_API_USER}:${JIRA_API_TOKEN}"`, as `.claude/rules/jira.md` in the repository says.

## Prerequisites

- `lcp auth token` prints a token. When it does not, ask the user to run `! lcp login`.
- `JIRA_API_USER` and `JIRA_API_TOKEN` are set.
- The `liferay-one-etc-spring-boot` build clones `liferay/liferay-release-tool-ee` over SSH, so the SSH key must have access to it.

## Workflow

### Step 0. Ask for the Release Date

Ask the user for the release date before you do anything else, also when the invocation gives a date. Show the date of today as the first option, and the date from the argument when there is one. Do not continue until the user answers.

Convert the answer to `yyyy-MM-dd`. This is `<date>`, and the release branch is `one-release-<date>`. The date can differ from the date of today, for example when the release is cut one day early.

### Step 1. Find the Previous Release

```bash
cd "$(git rev-parse --show-toplevel)"

git fetch --quiet liferay-one master-temp

git ls-remote --heads liferay-one 'one-release-*' | awk '{print $2}' | sed 's#refs/heads/##' | sort
```

`<previous>` is the last name in the list that is not `<release>`. When `<release>` is already in the list, stop and ask the user. Somebody cut the release already, and a second push overwrites nothing but deploys again.

Fetch `<previous>`, and confirm that `master-temp` contains it:

```bash
git fetch --quiet liferay-one <previous>

git merge-base --is-ancestor liferay-one/<previous> liferay-one/master-temp && echo contained || git log --format='%h %s' liferay-one/master-temp..liferay-one/<previous>
```

When `master-temp` does not contain it, the previous release has commits that `master-temp` does not have, such as a hotfix. The new release removes them from one-uat. Show them to the user and stop.

### Step 2. Cut and Push the Release Branch

Push the release branch straight from the remote ref. Do not check it out in `<portal>`, because other sessions can switch the branch of that checkout at any time:

```bash
git -C <portal> push liferay-one liferay-one/master-temp:refs/heads/<release>

git -C <portal> fetch --quiet liferay-one <release>
```

To add commits to a release that exists, push the new `master-temp` the same way after you confirm that `git merge-base --is-ancestor liferay-one/<release> liferay-one/master-temp` succeeds. A push to a `one-release-*` branch does not start a GitHub workflow. Only a push to `one-uat` deploys, through `.github/workflows/ci-deploy-liferay-one-uat.yaml`.

### Step 3. List the Commits and the Tickets

```bash
git log --reverse --format='%h %an %s' liferay-one/<previous>..liferay-one/<release>
```

A commit title starts with one or more ticket IDs, for example `LPD-12345 LPD-67890 Summary`. Collect every ID at the start of each title. Then record, for each ticket, its commits and the client extensions that they change:

```bash
git show --format= --name-only <sha> \
	| sed --quiet 's#^workspaces/liferay-one-workspace/client-extensions/\([^/]*\)/.*#\1#p' \
	| sort --unique
```

Get the summary, the status, the type, the assignee, the reporter, the description, and the comments of each ticket:

```bash
curl \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>?fields=assignee,comment,description,issuetype,reporter,status,summary" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}"
```

The description and the comments are Atlassian Document Format (ADF). Flatten them to text with `jq '[.. | .text? | strings] | join(" ")'`.

Show the user a table of the tickets with their commits, client extensions, status, and assignee before you deploy.

### Step 4. Build and Deploy

A release is one LCP build. Deploy every release client extension that the release changes, in one build, also when you add tickets to a release that is already deployed. Then each service of the release shows the same build and the same commit. Do not deploy a release client extension that the release does not change.

A client extension is in `<deploy>` when its folder changed between the previous release and this release, or when its folder changed since its last deploy. The second check finds a change that reached `master-temp` before the previous release but did not deploy. The service ID is the client extension name without hyphens.

```bash
cd <workspace>

DEPLOYED=$(bash <test-ticket>/scripts/deployed_commits.sh)

for cx in liferay-one-custom-element liferay-one-etc-spring-boot liferay-one-instance-settings liferay-one-kong
do
	commit=$(echo "${DEPLOYED}" | awk -F '\t' -v service="${cx//-/}" '$1 == service {print $5}')

	if ! git diff --quiet liferay-one/<previous> liferay-one/<release> -- "client-extensions/${cx}"
	then
		echo "${cx} deploy, changed in the release"
	elif [ -z "${commit}" ] || [ "${commit}" == "-" ] || ! git cat-file -e "${commit}^{commit}" 2> /dev/null
	then
		echo "${cx} deploy, no deployed commit"
	elif ! git diff --quiet "${commit}" liferay-one/<release> -- "client-extensions/${cx}"
	then
		echo "${cx} deploy, changed since ${commit:0:8}"
	else
		echo "${cx} skip, unchanged"
	fi
done
```

When `git cat-file` fails for a commit, run `git fetch liferay-one` and check again before you deploy because of it. The client extensions with `deploy` are `<deploy>`.

The check looks only at the folder of each client extension. Also list the changes to the shared build inputs in `scripts/deploy.sh`, such as `build.gradle`, `gradle.properties`, `package.json`, and `yarn.lock`:

```bash
git diff --stat liferay-one/<previous> liferay-one/<release> -- .yarnrc build.gradle gradle gradle-local.properties gradle.properties gradlew package.json settings.gradle tools yarn.lock
```

When one of these changes the build of a client extension that is not in `<deploy>`, show the change to the user and ask whether to deploy that client extension too. A change in `tools/visuals` does not change a build.

When `<deploy>` is empty, tell the user that nothing changed, do not deploy, and continue with Step 5. Otherwise, build and deploy from `<clone>`, a fresh local clone that has `<release>` checked out. `lcp deploy` records the branch and the last commit of the checkout on the LCP build, and `<test-ticket>/scripts/deployed_commits.sh` reads them back. Do not deploy from a git worktree: `lcp deploy` then fails with `NotFoundError: Could not find HEAD`, because the git library that it uses does not read the `.git` file of a worktree. Do not deploy from `<portal>`, because another session can switch its branch during the build.

`--local` makes hard links to the objects of `<portal>`, so the clone takes seconds and almost no disk space. The sparse checkout holds only the workspace:

```bash
rm -rf <clone>

git clone --local --no-checkout --quiet <portal> <clone>

cd <clone>

git remote add liferay-one "$(git -C <portal> remote get-url liferay-one)"

git fetch --quiet liferay-one <release>

git sparse-checkout set workspaces/liferay-one-workspace

git switch --create <release> --no-track --quiet liferay-one/<release>

cd workspaces/liferay-one-workspace

scripts/deploy_uat.sh <deploy>
```

The script runs `./gradlew clean`, then `build` on each client extension, which also runs the tests of each one, then one `lcp deploy` with the services in one LCP build. The build takes several minutes, so run it in the background and wait for it to exit. When the build fails, stop and show the user the failure. Do not deploy a failed build.

Then confirm that each service deployed the release:

```bash
bash <test-ticket>/scripts/deployed_commits.sh
```

The row of each service in `<deploy>` must show the same new build, the branch `<release>`, and the commit `git rev-parse HEAD`. The rows of the other services keep their previous build. When you add tickets to a release, the new build replaces the earlier build of the release for each service, so the deploy comments of the earlier tickets name an older build. Name the new build in the report. A row that still shows the previous build did not deploy. Read its log with `lcp log -p exte5a2oneliferay-extuat -s <service>` and tell the user.

### Step 5. Find the Manual Steps

A ticket has a manual step when the release does not apply all of its change. Look at these sources for each ticket:

- **The ticket text.** Read the description and the comments for steps to do after the deploy, such as a configuration, a data fix, a credential to send, or a script to run. A comment often says that a step is done on prod but not on one-uat.
- **Changes that this release does not deploy.** Check each one, also when the ticket text says nothing about it. A ticket often does not mention a change to a client extension that is not deployed. List these changes:

	```bash
	git diff --stat liferay-one/<previous> liferay-one/<release> -- \
		$(printf 'workspaces/liferay-one-workspace/client-extensions/%s ' liferay-one-batch liferay-one-batch-products liferay-one-global-css liferay-one-site-initializer)
	```

	Read the diff of each commit, item by item. For each item that the diff adds, changes, or removes, query one-uat and record whether one-uat has the new state. An item that one-uat does not have is a manual step. Use the table to find how one-uat gets the change and how to check it:

| Client Extension | How one-uat Gets the Change | How to Check |
| --- | --- | --- |
| `liferay-one-batch` | A deploy of the batch. Deploy it alone, before any other client extension, with `scripts/deploy_uat.sh liferay-one-batch`. A batch redeploy removes the relationship values of system objects, so ask the user first | Query the object definition, field, or picklist over the headless APIs |
| `liferay-one-batch-products` | No deploy to Liferay Cloud, because its product import fails there. Create or delete each changed item over `/o/c/entitlementdefinitions`, `/o/c/entitlementdefinitionskus`, or the commerce APIs, with the values from the batch file. A new entitlement definition link gives no entitlement to the existing order items. Call `POST /entitlements/generate?commerceOrderItemId=<id>` on etc-spring-boot for each order item of the SKU. Find them with `GET /o/headless-commerce-admin-order/v1.0/orderItems?filter=sku eq '<sku ERC>'`. The call skips an order that is not completed, so a pending order gets no entitlement until it completes | `GET /o/c/<plural>/by-external-reference-code/<ERC>` for each added or removed item. A removed item returns 404 |
| `liferay-one-site-initializer` | A deploy to the existing site does not apply the change. Apply a grant in `resource-permissions.json` with `PATCH /o/headless-admin-user/v1.0/roles/{roleId}` and `rolePermissions`. The call adds grants and does not remove them. Send every action of the resource, not only the new ones. For scope `1`, set `primaryKey` to the company ID | Read the role permissions with `GET /o/headless-admin-user/v1.0/roles/{roleId}`. The count must be the old count plus the new resources |
| `liferay-one-global-css` | A deploy of that client extension with `scripts/deploy_uat.sh <client extension>` | `deployed_commits.sh` shows a commit that contains the fix commit |

- **A new OAuth application in `liferay-one-instance-settings`.** The deploy creates the application. Its client ID and secret go to the person who asked for them, through a private channel. Never put a secret in a Jira comment.

A manual step is done already when one-uat has the result. For example, a ticket comment can say that the data was fixed by hand, or `deployed_commits.sh` can show that another build deployed the change. Check the result, and record the step as done.

Show the user one list: each ticket, each manual step, the commands or calls that do it, and the steps that are done already. Do the steps only after the user confirms the list. Then check each result with the query in the table.

### Step 6. Comment That the Ticket Is on one-uat and Set the Release Date

Add one comment to each ticket from Step 3, also a closed ticket. Write it in Simplified Technical English, as `rules/simplified-technical-english.md` says:

```text
Deployed to one-uat on <date> in `<release>`, LCP build <build>, commit `<short sha>`. The build deployed <each client extension in `<deploy>`>.

The release contains these commits for this ticket:
- `<short sha>` <title>

<The manual steps done for this ticket, or no paragraph when there are none.>
```

Convert the text to ADF and post it as `<test-ticket>/SKILL.md` Step 7 shows, with `<test-ticket>/scripts/adf.py`.

Then set the Release Date of each ticket to `<date>`. Read the field first. Another person can set it before you do, so change it only when it is empty or has another date, and tell the user about each ticket that had another date:

```bash
curl \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>?fields=customfield_10233" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	| jq --raw-output .fields.customfield_10233

curl \
	--data '{"fields": {"customfield_10233": "<date>"}}' \
	--header "Content-Type: application/json" \
	--request PUT \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	--write-out '%{http_code}\n'
```

A `204` means success. When the call fails, tell the user and continue with the next ticket.

### Step 7. Test Each Ticket

Test each ticket that can be tested, one at a time. Follow `<test-ticket>/SKILL.md` Steps 2, 5, 6, and 7, with these changes:

- Do not do Step 1. Test the ticket whoever it is assigned to.
- Do not do Step 8. Do not close the ticket and do not change the assignee.
- Steps 3 and 4 are done. Step 4 above confirmed the deploy, so start the comment with the build and the commit from it.

Do not test a ticket in these cases, and tell the user why:

- The status is `Closed`. The ticket was tested already.
- Every commit of the ticket changes only tests, specs, or `tools/visuals`.
- The test needs a write to one-uat data, and the user does not permit it.
- The test needs an outside system that you cannot use, such as a Salesforce opportunity or a customer environment.
- The change is in a client extension that one-uat does not have yet.

Find the tickets whose test needs a write, and ask the user about all of them in one question. A test on data that never showed the defect proves nothing, so find real data first. For example, call a read endpoint for each project until one shows the defect, with a limit on the number of projects.

Add the test comment only when the result is clear. When the result is not clear, stop and ask the user.

## Report

Tell the user:

- The release branch, the previous release, and the number of commits and tickets.
- The LCP build and the deployed commit of each service.
- Each manual step and its result.
- A table of the tickets: the Release Date, the deploy comment link, the test result (passed, failed, or not tested and why), and the test comment link. A comment link is `https://liferay.atlassian.net/browse/<TICKET>?focusedCommentId=<id>`.
- A list to post in Slack. Slack shows the summary of a Jira link, so write one line for each ticket: the result emoji, then the full ticket URL. Use `:white_check_mark:` for passed, `:x:` for failed, and `:hourglass:` for not tested, with the reason in parentheses.

```text
:white_check_mark: https://liferay.atlassian.net/browse/LPD-12345
:hourglass: https://liferay.atlassian.net/browse/LPD-67890 (needs a Salesforce opportunity)
```

## Patterns and Gotchas

- **The `one-uat` branch does not show what is deployed.** Builds come from `master-temp` and from release branches, and several people deploy. Always read the deployed commit from LCP.
- **A dirty checkout deploys code that is not on the branch.** `lcp deploy` records the branch and the commit, but builds the files in the checkout. This is why Step 4 builds from a fresh clone.
- **The build changes `package.json`.** The build moves `tests` to the end of the yarn workspaces list. The change has no effect, and `<clone>` is recreated for each deploy, so leave it.
- **A ticket can merge while the release deploys.** Before the report, compare the release branch with `git ls-remote liferay-one refs/heads/master-temp`. When `master-temp` has new commits, tell the user, and add them only when the user asks. Push the new `master-temp` to `<release>` as Step 2 shows, then repeat Step 4. Step 4 deploys every client extension that the release changes again, in one new build.
- **The deploy does not wait for batch imports.** When a release also deploys `liferay-one-batch`, deploy it alone first and wait for its import, because the other client extensions can depend on its objects. See `specs/technical/provisioning.md`.
- **A Jira comment is public to everyone with access to the ticket.** Do not put a client secret, a password, or a token in it.

## Success Signal

`deployed_commits.sh` shows each service in `<deploy>` on `<release>` at the release commit, and each other release service at a commit with no change to its folder, and each ticket from Step 3 has a deploy comment and the Release Date `<date>`. Each tested ticket also has a test comment with its steps and a passed or failed result.

## See Also

- `skills/one-uat-test-ticket/SKILL.md` — tests one ticket on one-uat. Step 7 follows it.
- `skills/manage-cloud-project/SKILL.md` — general `lcp` operations.
- `scripts/deploy_uat.sh` — builds and deploys client extensions to one-uat in one LCP build.