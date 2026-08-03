# One Team — Jira Recipes

Phase 0 reference for the coordinator. Read once, at kickoff, then work from the digests on disk.

Read-only. Never transition tickets or post comments from this workflow.

## The Ticket

```bash
curl --silent --user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	"https://liferay.atlassian.net/rest/api/3/issue/<TICKET>" > ticket.json
```

Validate before digesting or briefing anyone: `ticket.json` must contain the requested issue key. When it does not, stop and tell the user which it is — credentials (`JIRA_API_USER`/`JIRA_API_TOKEN` unset or rejected) or an unknown ticket. A planner briefed on an error body plans garbage.

## The Initiative

Every ticket under the One Liferay initiative, for surrounding context. Fetch it whole: the planner is looking for work in flight that this ticket must not collide with, and a collision is exactly the thing nobody can search for in advance. The digest below reduces it thirteenfold, so the whole list is affordable to keep.

```bash
curl --silent --get --user "${JIRA_API_USER}:${JIRA_API_TOKEN}" \
	--data-urlencode 'jql=issue in portfolioChildIssuesOf("LPD-87600") ORDER BY key' \
	--data-urlencode 'fields=issuetype,status,summary' \
	"https://liferay.atlassian.net/rest/api/3/search/jql"
```

The endpoint paginates — pass `maxResults` and follow `nextPageToken` until the list is exhausted. Build the token flag with an explicit branch, not `${TOKEN:+--data-urlencode "nextPageToken=${TOKEN}"}`, since zsh does not word-split that expansion and curl receives one malformed argument:

```bash
TOKEN=""
while :; do
	if [ -n "${TOKEN}" ]; then RESP=$(curl <flags as above> --data-urlencode "nextPageToken=${TOKEN}" "<url>"); else RESP=$(curl <flags as above> "<url>"); fi
	echo "${RESP}" >> pages.jsonl
	TOKEN=$(echo "${RESP}" | jq -r '.nextPageToken // empty')
	[ -z "${TOKEN}" ] && break
done

jq -s '{issues: [.[].issues[]]}' pages.jsonl > initiative.json
```

When `portfolioChildIssuesOf` is unavailable, fall back to `parent = LPD-87600` and walk one level down.

Also pull the ticket's own graph — parent, subtasks, and issue links — which is already in `ticket.json` and costs no extra call. Append it to the digest so the planner sees the direct relationships without hunting for them:

```bash
jq -r '[.fields.parent, .fields.subtasks[]?, (.fields.issuelinks[]? | .inwardIssue, .outwardIssue)]
	| map(select(. != null))
	| .[] | "\(.key) | \(.fields.status.name) | \(.fields.summary)"' ticket.json
```

## The Digests

The raw responses are far too large to read: a 584-issue initiative measured about a hundred and eighty thousand tokens, and one rich ticket about thirteen thousand. These recipes were run against exactly that data and reduced them to roughly fourteen thousand and four hundred tokens respectively — thirteenfold and thirtyfold — with the acceptance criteria, dev notes, and dependencies intact:

```bash
jq -r '.issues[] | "\(.key) | \(.fields.issuetype.name) | \(.fields.status.name) | \(.fields.summary)"' \
	initiative.json > initiative-digest.md

{
	jq -r '"# \(.key) — \(.fields.summary)\n\nType: \(.fields.issuetype.name)\nStatus: \(.fields.status.name)\n"' ticket.json
	jq -r '.fields.description | [.. | objects | select(.type == "text") | .text] | join(" ")' ticket.json
} > ticket-digest.md
```

The description is Atlassian Document Format, hence the text-node flatten — verify the acceptance criteria survived it, and fall back to reading `.fields.description` alone when a ticket uses tables or panels the flatten mangles.

Brief teammates on the digests. The raw JSON stays on disk for targeted `jq` when someone needs a field a digest dropped; it is never read whole.