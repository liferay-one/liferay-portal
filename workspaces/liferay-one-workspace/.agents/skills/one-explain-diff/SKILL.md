---

allowed-tools: [Bash, Glob, Grep, Read, Write]
description: Produce a rich, interactive HTML explanation of a code change, diff, branch, or PR. Use when the user asks to explain, walk through, or teach a diff/branch/PR, or invokes /one-explain-diff.
name: one-explain-diff

---

# Explain a Diff

Produce a rich, interactive explanation of a specified code change as a single self-contained HTML file. The goal is to teach the change — its context, its essence, and its details — to a reader who may know nothing about the surrounding system.

## Resolve the Target

Figure out which change to explain, in priority order:

1. **User argument** — an explicit ref, range, branch, or PR number the user names (e.g. `HEAD~3..HEAD`, `LPD-12345`, a PR URL, a branch name).

1. **Current branch vs. base** — when nothing is named, diff the current branch against `liferay-one/master-temp`:

	```bash
	git diff liferay-one/master-temp...HEAD
	```

1. **Fallback** — if the diff is empty or ambiguous, ask the user what to explain.

Read the full diff and the commit messages (`git log`) before writing anything.

## Explore Before Explaining

Do not explain the diff in isolation. Read the surrounding code so the "Background" section is accurate: open the files the diff touches, follow the key types and callers, and understand the subsystem the change lives in. Where the workspace conventions matter (Objects, client extensions, site initializers, headless APIs), consult the relevant reference cards under `rules/`. If a Jira ticket is referenced, read it through the Jira REST API for the intended behavior and motivation.

## Required Sections

Structure the explanation as one long page with these sections, in order:

- **Background** — Explain the existing system relevant to this change. The reader's starting knowledge is unknown, so provide a *deep background for beginners* (clearly marked as skippable for those already familiar) followed by a *narrow background* directly relevant to the change.

- **Intuition** — Explain the core intuition for the change. Focus on the essence, not the full details. Use concrete examples with toy data. Use figures and diagrams liberally.

- **Code** — A high-level walkthrough of the actual changes. Group and order the changes so they build on one another, rather than following file order.

- **Quiz** — Five interactive multiple-choice questions of medium difficulty. Hard enough that answering requires genuinely understanding the substance of the change, but not gotchas. On click, each option reveals whether it was correct and gives feedback. The goal is to let the reader confirm they understood.

## Writing Style

- Write with the clarity and flow of Martin Kleppmann — engaging, in classic style, explaining *why* before *how*. Make transitions between sections smooth so the page reads as a continuous narrative rather than disjoint blocks.

- Use callouts (styled boxes) for key concepts, definitions, and important edge cases.

## Diagrams

- Pick a small number of diagram *families* and reuse them throughout to explain different cases. Useful kinds:
  - A simplified mockup of the UI the user sees, to explain UI changes.
  - A system diagram showing data flow or communication between components — **include example data** in the diagram, not just labels.

- **Never use ASCII diagrams.** Build every diagram from simple HTML and CSS (boxes, arrows, flex/grid layouts). Use HTML lists for lists of things.

## HTML Output Format

- Output a **single self-contained HTML file** with all CSS and JavaScript inlined. No external assets or CDN dependencies.

- One long scrollable page with section headers and a table of contents at the top. Do **not** use tabs for the top-level structure.

- Include basic responsive styling so it reads well on a phone.

- **Code blocks:** always wrap code in `<pre>` tags. If you use a styled `<div>` instead, its CSS **must** include `white-space: pre-wrap`, or the browser collapses all newlines into one line. Before saving, scan every code block in the HTML source and confirm its CSS includes `white-space: pre` or `pre-wrap`.

## File Location and Naming

Write the file to a global location **outside** the code repository (e.g. `/tmp`), never inside the workspace or `liferay-portal` checkout — it must stay out of version control.

The filename must start with today's date in `YYYY-MM-DD-` format, so files stay time-sorted:

```
/tmp/YYYY-MM-DD-explanation-<slug>.html
```

Use the current date (available in session context) and a short kebab-case `<slug>` derived from the change (e.g. the ticket key or a summary). After writing, print the absolute path so the user can open it.
