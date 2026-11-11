---

argument-hint: <TICKET>
description: Verify a Liferay One Jira ticket on one-uat. Confirm that the ticket is assigned to the current user, confirm that the fix is deployed, reproduce the ticket on one-uat, add a Jira comment with the test steps and a pass or fail result, and, when the test passes, close the ticket if the current user reported it or assign it to the reporter to verify. Use when the user asks to test, verify, or check a ticket on one-uat or UAT, or invokes /one-uat-test-ticket.
name: one-uat-test-ticket

---

# Verify a Ticket on one-uat

Test one Jira ticket on one-uat and record the result on the ticket. When the test passes and the user is the reporter, close the ticket. When the test passes and another person is the reporter, assign the ticket to the reporter so that they can also verify it. Do not close a ticket that another person reported.

The user gave permission for this skill to add the comment, to close the ticket, and to assign the ticket to its reporter without a further question. That permission applies only to the ticket in the argument, and only when every step below succeeds. Ask the user before you do anything outside these steps, such as a write to one-uat data.

## Values

| Name | Value |
| --- | --- |
| `<scratchpad>` | The session scratchpad directory |
| `<workspace>` | `$(git rev-parse --show-toplevel)/workspaces/liferay-one-workspace` |
| `<skill>` | `<workspace>/.agents/skills/one-uat-test-ticket` |
| one-uat portal | `https://one-uat.liferay.com` |
| one-uat login page | `https://one-uat.liferay.com/?p_p_id=com_liferay_login_web_portlet_LoginPortlet&p_p_lifecycle=0&p_p_state=maximized&p_p_mode=view&_com_liferay_login_web_portlet_LoginPortlet_mvcRenderCommandName=%2Flogin%2Flogin&saveLastPath=false` |
| LCP project | `exte5a2oneliferay-extuat` |
| etc-spring-boot LCP service | `liferayoneetcspringboot` |
| etc-spring-boot URL | `https://liferayoneetcspringboot-exte5a2oneliferay-extuat.lfr.cloud` |
| etc-spring-boot OAuth2 application | `liferay-one-etc-spring-boot-oaua` |
| Upstream remote | `liferay-one` (branch `master-temp`) |

Every Jira call is a `curl` call with `--user "${JIRA_API_USER}:${JIRA_API_TOKEN}"`, as `.claude/rules/jira.md` in the repository says.

## Step 1. Confirm That the Ticket Is Assigned to the User and Find the Reporter

```bash
ME=$(curl --silent --url "https://liferay.atlassian.net/rest/api/3/myself" --user "${JIRA_API_USER}:${JIRA_API_TOKEN}" | jq --raw-output .accountId)

curl \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>?fields=assignee,reporter,status,summary" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	| jq --arg me "${ME}" '{assignedToMe: (.fields.assignee.accountId == $me), assignee: .fields.assignee.displayName, reportedByMe: (.fields.reporter.accountId == $me), reporter: .fields.reporter.displayName, reporterAccountId: .fields.reporter.accountId, status: .fields.status.name, summary: .fields.summary}'
```

Stop and tell the user when `assignedToMe` is `false` or the status is already `Closed`. Do not comment and do not test.

Record `reportedByMe`, `reporter`, and `reporterAccountId`. Step 8 uses them.

## Step 2. Read the Ticket

Get `summary`, `description`, `status`, `issuelinks`, and every comment. The description is Atlassian Document Format (ADF). Flatten it to text with a short `jq` or Python step. Find these sections:

- **Steps to Reproduce** — the test steps.
- **Expected Behavior** — the pass condition.
- **Actual Behavior** — the failure to look for.

When the ticket has no clear steps or no clear expected result, write a test plan from the summary and the fix, and show it to the user before you run it.

## Step 3. Find the Fix

```bash
cd "$(git rev-parse --show-toplevel)"

git fetch --quiet liferay-one

git log --all --format='%h %ci %s' --grep=<TICKET>
```

For each commit that is not a test or a source format commit:

- Confirm that `liferay-one/master-temp` contains it: `git merge-base --is-ancestor <sha> liferay-one/master-temp`.
- Read `git show <sha>` to learn which client extension it changes and what the deployed code must contain.
- Record the commit date. A deploy that is older than the merge cannot contain the fix.

When no commit exists, or `master-temp` does not contain the fix, stop and tell the user. Do not comment.

The `one-uat` branch does not show what is deployed. Builds also come from `master-temp` and from release branches such as `one-release-2026-11-10`, and several people deploy. Always get the deployed commit from LCP.

## Step 4. Confirm That the Fix Is Deployed

Each LCP build records the commit that it was built from. Get the commit of the last successful deploy of each service that the fix changes. The service ID is the client extension directory without hyphens, for example `liferay-one-etc-spring-boot` is `liferayoneetcspringboot`.

```bash
bash <skill>/scripts/deployed_commits.sh

bash <skill>/scripts/deployed_commits.sh liferayoneetcspringboot
```

The columns are the service ID, the deploy time, the build, the branch, the commit, and the user who deployed. Then confirm that the deployed commit contains every fix commit:

```bash
git cat-file -e <deployed commit> || git fetch liferay-one

git merge-base --is-ancestor <fix commit> <deployed commit> && echo deployed || echo "not deployed"
```

When `git cat-file` still fails after the fetch, fetch the branch from the output by name. When the commit column shows `-`, the deploy did not come from Git, so inspect the artifact as the sections below show.

The fix is deployed only when every client extension that the fix changes has a deployed commit that contains the fix. Put the service, the build, and the deployed commit in the Jira comment.

### Inspect the Artifact

Use these recipes when the deploy has no commit, or when the result is not what the deployed commit predicts.

#### `liferay-one-etc-spring-boot`

Inspect the jar on the pod. `lcp shell` needs a TTY, so use the helper:

```bash
python3 -I <skill>/scripts/lcp_shell.py liferayoneetcspringboot \
	'ls -la /opt/liferay/jar-runner.jar' \
	'unzip -l /opt/liferay/jar-runner.jar | grep <ChangedClass>'
```

The jar date must be later than the merge. Then prove that the changed code is present. A `grep` for a class name in the bytecode is not proof, because the constant pool can contain the same name for another reason. Copy the class out and disassemble it:

```bash
cd <scratchpad>

python3 -I <skill>/scripts/lcp_shell.py liferayoneetcspringboot \
	'echo B64START; unzip -p /opt/liferay/jar-runner.jar BOOT-INF/classes/<path/to/Class>.class | base64 -w0; echo; echo B64END' \
	> shell_out.txt 2>&1

python3 -I <skill>/scripts/extract_b64.py shell_out.txt Class.class

javap -c -p Class.class | grep -n -A3 -B3 '<changed call>'
```

#### `liferay-one-custom-element`

The bundle is one file of about 3 MB. Find its URL in the home page HTML, download it, and grep it for a string literal that the fix adds, such as a field name, an i18n key, or an endpoint path. Confirm with `git grep` on the commit parent that the string is new, or read the code around the match.

```bash
cd <scratchpad>

curl --silent --location https://one-uat.liferay.com/ --output home.html

URL=$(grep --only-matching --extended-regexp 'https://liferayonecustomelement-exte5a2oneliferay-extuat\.lfr\.cloud/index\.[A-Za-z0-9_-]+\.js' home.html | head -1)

curl --dump-header headers.txt --output bundle.js --silent "${URL}"

grep --only-matching --extended-regexp '.{200}<new string>.{200}' bundle.js
```

#### `liferay-one-batch` and `liferay-one-site-initializer`

Query the deployed result over the headless APIs, for example the object definition, the field, the picklist entry, or the role grant that the fix adds.

A batch deploy runs once and does not stay as a service, so `liferayonebatch` has deploys but no running service. Its last deploy can be months old while the objects changed by other means, so query the result when the fix changes batch files.

### When the Fix Is Not Deployed

Stop and tell the user what is deployed and what is missing. Do not comment and do not change the ticket.

## Step 5. Sign In to one-uat

Use the chrome-devtools MCP browser. Do not ask the user to sign in until the steps below fail.

1. Open the one-uat portal with `new_page` and `background: true`. When the tool reports that the browser is already running, ask the user before you stop the other Chrome process.

1. Check the session with `evaluate_script`: `() => Liferay.ThemeDisplay.isSignedIn()`. When it is `true`, the session is ready.

1. When `ONE_UAT_USER` and `ONE_UAT_PASSWORD` are set, write the sign in function to a file. The browser tool reads the file by `sourcePath`, so the password is never in a tool argument or in the transcript:

	```bash
	bash <skill>/scripts/write_login_js.sh <scratchpad>/login.js
	```

	Navigate the page to the one-uat login page. Do not use `/c/portal/login`, because it redirects to Okta. Call `evaluate_script` with `sourcePath` set to `<scratchpad>/login.js`. Delete the file immediately after, also when the call fails:

	```bash
	rm -f <scratchpad>/login.js
	```

	The function returns `No login form` when the session is already signed in. Wait for the navigation, then check `isSignedIn()` again.

1. When the variables are not set, or the sign in fails, ask the user to sign in in the open browser window and to tell you when they are done.

Never type the password with `fill` or `type_text`, and never print the variables.

## Step 6. Run the Test

Follow the Steps to Reproduce. Run every step as the signed in user, so permissions apply as they do for a customer.

- Call a portal API from the page: `fetch('/o/...', {headers: {'x-csrf-token': Liferay.authToken}})`.
- Call etc-spring-boot from the page: `(await Liferay.OAuth2Client.FromUserAgentApplication('liferay-one-etc-spring-boot-oaua')).fetch('/<path>')`.
- Open the custom element page with `navigate_page`. Read the requests with `list_network_requests`, and read the rendered rows with `evaluate_script`. Prefer a snapshot to a screenshot.

`Liferay.OAuth2Client` behaves in three ways that are easy to read as a failure:

- It is not available on a Control Panel page. Call it from a site page, such as the home page.
- `fetch` returns the parsed body for an `application/json` response, and a `Response` for other content types. Check `typeof response.text` before you call it.
- `fetch` throws the `Response` for a status that is not 2xx. Catch it and read `status` from the thrown value.

Keep the test read only. When a step needs a write to one-uat data (create, update, delete, order, or sync), ask the user first.

When a test needs a user with only some roles, create a test user with an `@example.com` address over `POST /o/headless-admin-user/v1.0/user-accounts`, and sign in to it in a page with `isolatedContext`, so the administrator session stays. Generate its password in a file and read the file by `sourcePath`, as Step 5 does. The first sign in opens `/c/portal/update_password`, so set a second generated password the same way. Delete each password file after use. After the test, remove the roles from the test user and set its status to `Inactive`.

Choose data that shows the defect. For a filter defect, find a record that the old behavior includes and the new behavior excludes, and compare the old query with the new query. A test on data that never showed the defect proves nothing.

Record the evidence: the URL, the HTTP status, the counts, and the values that the user sees.

The test **passes** when the Expected Behavior occurs and the Actual Behavior does not. The test **fails** when the Actual Behavior still occurs. When the result is not clear, stop and ask the user. Do not comment.

For server errors, read the etc-spring-boot log. `lcp log` is slow, so write it to a file and then grep the file:

```bash
timeout 200 lcp log -p exte5a2oneliferay-extuat -s liferayoneetcspringboot --since "2 hours ago" > <scratchpad>/uat.log 2>&1
```

## Step 7. Add the Comment

Write the comment in Simplified Technical English, as `rules/simplified-technical-english.md` says. Use this shape:

```text
Tested on one-uat on <yyyy-MM-dd>. Result: passed.

1. Confirmed that the fix is deployed. <For each service: the service, the build, the deployed commit, and that it contains the fix commit.>
2. Signed in to one-uat as <the kind of user>.
3. <Each test step, with the URL or the endpoint.>

<What happened: the status, the counts, the values. Compare with the behavior before the fix.>
```

When the test passed and `reportedByMe` is `false`, add this last paragraph:

```text
Assigned to <reporter> to verify.
```

For a failure, write `Result: failed.` and state the Actual Behavior that still occurs, with the evidence and any log error.

Write the text to a file, convert it to ADF, and post it. The converter makes a paragraph from each block, an ordered list from `1.` lines, a bullet list from `-` lines, and inline code from backticks:

```bash
python3 -I <skill>/scripts/adf.py <scratchpad>/comment.txt > <scratchpad>/comment.json

curl \
	--data @<scratchpad>/comment.json \
	--header "Content-Type: application/json" \
	--request POST \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>/comment" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	| jq '{id, created, errorMessages}'
```

## Step 8. Close the Ticket or Assign It to the Reporter

Do this step only when the test passed and the comment posted. When the test fails, do not change the status or the assignee.

The reporter decides the action:

- When `reportedByMe` is `true`, close the ticket as "Close the Ticket" below shows.
- When `reportedByMe` is `false`, do not close the ticket. Assign it to the reporter as "Assign the Ticket to the Reporter" below shows.

### Assign the Ticket to the Reporter

When `reporterAccountId` is `null`, stop and ask the user who must verify the ticket. Otherwise, do not change the status. Set the assignee to the reporter:

```bash
curl \
	--data '{"accountId": "<reporterAccountId>"}' \
	--header "Content-Type: application/json" \
	--request PUT \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>/assignee" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	--write-out '%{http_code}\n'
```

A `204` means success. Get the ticket again and confirm that the assignee is the reporter. When the call fails, for example because the reporter cannot be assigned in the project, stop and tell the user. Do not assign the ticket to another person.

### Close the Ticket

Find the transition by name, because its ID can change with the status:

```bash
curl \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>/transitions?expand=transitions.fields" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	| jq '.transitions[] | select(.name == "Closed") | {id, required: [.fields | to_entries[] | select(.value.required) | .key]}'
```

The `Closed` transition requires `resolution` and `customfield_10979` (Cross Cutting Properties). Use `Fixed` and `None`. The transition also has a validator that requires a Fix version, and the transition metadata does not list it as required. The Fix version of a Liferay One ticket is `Master`:

```bash
curl \
	--data '{"fields": {"customfield_10979": [{"value": "None"}], "fixVersions": [{"name": "Master"}], "resolution": {"name": "Fixed"}}, "transition": {"id": "<id>"}}' \
	--header "Content-Type: application/json" \
	--request POST \
	--silent \
	--url "https://liferay.atlassian.net/rest/api/3/issue/<TICKET>/transitions" \
	--user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	--write-out '%{http_code}\n'
```

A `204` means success. Get the ticket again and confirm that the status is `Closed`. When the transition requires other fields, or no `Closed` transition exists, stop and tell the user. Do not guess the values.

## Step 9. Report to the User

Tell the user:

- The result, passed or failed.
- The deployed commit of each changed service, and the fix commit that it contains.
- What the test did and what it showed.
- The comment link: `https://liferay.atlassian.net/browse/<TICKET>?focusedCommentId=<id>`.
- The new status and the assignee of the ticket. When the ticket went to the reporter, say that the reporter must verify and close it.