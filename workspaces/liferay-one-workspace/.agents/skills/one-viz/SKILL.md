---

allowed-tools: [Artifact, Bash, Edit, Read]
description: Build the interactive workspace visuals in `tools/visuals` from the current source, check them for drift, and republish each one to its claude.ai artifact URL. Use when the user asks to update, rebuild, refresh, or publish the visuals, or invokes /one-viz.
name: one-viz

---

# Build and Publish the Workspace Visuals

Each visual in `tools/visuals/<name>/` is an extractor that reads the workspace source and a template that renders the data. See `tools/visuals/README.md` for the layout. This skill builds every visual, fixes drift, and publishes the result to a stable URL.

## 1. Build

Run from `workspaces/liferay-one-workspace`:

```bash
node tools/visuals/build.ts
```

To build one visual, add its name: `node tools/visuals/build.ts object-model`.

## 2. Fix Drift

A problem line means that a visual's hand-maintained configuration no longer matches the code, or that the code has a defect an extractor can see. `yarn viz` prints problems as warnings and still writes every page. `yarn viz:check` exits 1 on any problem that `tools/visuals/known-defects.json` does not list. Do not publish a visual with an unlisted problem.

Fix each problem in `tools/visuals/<name>/`, not in the extractor's logic:

- An object, field, endpoint, or action that no longer exists: read the commit that removed or renamed it (`git log -S '<name>' --oneline`), then update or remove the reference.
- A new object with no domain: add it to the right domain in `object-model/config.json`.
- A finding marked fixed that the code contradicts, or an open finding that the code now satisfies: change its `sev`.
- A problem that reports a real defect in the code (for example an object action with no handler): do not change the extractor to hide it. Tell the user. When the user agrees, add an entry to `tools/visuals/known-defects.json` with the `visual`, a `match` substring of the problem, and a `reason` that names the ticket or audit ID.
- A known defect that "no longer occurs": the code is fixed. Remove its entry from `known-defects.json`.

Run `yarn viz:check` again until it exits 0.

## 3. Publish

Security detail. The Model and Controller pages, and the actions in Workspace Health, show where the audit found exploitable defects. Publish them private, and do not share their links until the S findings in the Go-Live Tasks artifact are fixed.

Read `tools/visuals/visuals.json`. For each visual you built:

- When `url` is set, publish `tools/visuals/build/artifact/<name>.html` with the Artifact tool and that `url`. Omit `icon`. The link stays the same.
- When `url` is `null`, publish the same file with the `icon` and `description` from `visuals.json`. Write the returned URL into the `url` field, so the next run updates the same artifact.

Publish `build/artifact/<name>.html`, never `build/<name>.html`. The second file has its own document skeleton for local viewing, and the Artifact tool adds one at publish time.

## 4. Report

Give the user one line per visual: its name, its link, and the number of open problems. Name any real defect that a problem reports.

## Add a Visual

1. Create `tools/visuals/<name>/extract.ts`. Export `extract()`, which returns `{data, problems, actions}`. Show only the current state in `data`. Return what needs attention in `actions`, which go to Workspace Health. Read the source of truth with the helpers in `tools/visuals/lib.ts`.

1. Create `tools/visuals/<name>/template.html`. Put `const DATA = __DATA__;` in its script. Follow the artifact page contract: no `<!doctype>`, `<html>`, `<head>`, or `<body>`, and a `<title>` first. Use the classes and tokens in `tools/visuals/theme.css`, and do not copy its rules.

1. Add the visual as a tab of the Model, View, or Controller page in `tools/visuals/visuals.json`. Add a page of its own, with `url` set to `null`, only when it belongs to no layer.

1. Build, fix the problems, and publish as above.