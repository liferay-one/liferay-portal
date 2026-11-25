# One Team — Jira Recipes

Phase 0 reference for the coordinator. Read once, at kickoff, then work from the digests on disk.

Read-only. Never transition tickets or post comments from this workflow.

Every Jira call is an Atlassian MCP tool call with `cloudId` `liferay.atlassian.net`, as `.claude/rules/jira.md` in the repository says. Do not use `curl`.

## The Ticket

Call `getJiraIssue` with `issueIdOrKey` `<TICKET>`, `responseContentFormat` `markdown`, and `fields` `["summary", "issuetype", "status", "description", "parent", "subtasks", "issuelinks"]`.

Validate before digesting or briefing anyone: the response must carry the requested issue key. When it does not, stop and tell the user which it is — the Atlassian MCP server is not connected or not authorized, or the ticket is unknown. A planner briefed on an error body plans garbage.

## The Initiative

Every ticket under the One Liferay initiative, for surrounding context. Fetch it whole: the planner is looking for work in flight that this ticket must not collide with, and a collision is exactly the thing nobody can search for in advance.

Call `searchJiraIssuesUsingJql` with:

- `jql`: `issue in portfolioChildIssuesOf("LPD-87600") ORDER BY key`
- `fields`: `["issuetype", "status", "summary"]`
- `maxResults`: `100`

The search paginates. Call it again with the `nextPageToken` of the previous response until a response has no `nextPageToken`. Do not request a count. Ask for these three fields only: the default field set includes the description of each issue, which makes every page many times larger.

When `portfolioChildIssuesOf` is unavailable, fall back to `parent = LPD-87600` and walk one level down.

Also take the ticket's own graph — parent, subtasks, and issue links — from the ticket response, which costs no extra call. Append it to the digest so the planner sees the direct relationships without hunting for them.

## The Digests

Write the digests to `<TEAMDIR>` as you read the pages, so no teammate reads a raw response:

- `initiative-digest.md` — one line per issue: `<key> | <issue type> | <status> | <summary>`.
- `ticket-digest.md` — a `# <key> — <summary>` heading, the type and the status, the description in Markdown, and then one line per related issue: `<key> | <status> | <summary>`.

Verify that the acceptance criteria survived the Markdown conversion. When a ticket uses tables or panels that the conversion mangles, read it again with `responseContentFormat` `adf` and transcribe the affected section.

Brief teammates on the digests. When someone needs a field that a digest dropped, the coordinator reads that one field again with `getJiraIssue` and a `fields` list, not the whole issue.