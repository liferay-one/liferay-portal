# Workspace Visuals

Interactive HTML pages that show the structure of this workspace. Each page is built from the source files, so a rebuild shows the current code.

One page: Workspace Report. It has a tab for each layer of the workspace. A layer tab starts with the actions of the layer, then has a section for each visual in it. The page shows one of two views: a snapshot of the workspace at one commit, or a comparison of two refs. See "Snapshot and Comparison" below.

| Workspace Report Tab | Sections, each a visual in `tools/visuals/<visual>` |
| --- | --- |
| Overview | The open actions of each layer, the age of each snapshot, and the triage queue. In a comparison: the new and resolved actions and the changed items of each layer, the new actions that nothing tracks, and, for a feature branch, the lifecycle: the artifact, status, and changed files of each phase |
| Workspace | Actions, Bundle (the dependencies and the custom element build), Tests (the test runs, then the test plan coverage of `test-coverage`), Changes, and Specs. In a comparison: Actions, Dependencies (the changed ones), Tests (the changed test files), Changed Files, and Specs (the changed specs and the names they make stale) |
| Model | Actions, Objects (`object-model`), Access (`permission-matrix`, the grants and then the roles), Environments (`environment-drift`), Rules (`rules`, the batch files) |
| View | Actions, Pages (`pages`), Components (`pages`, the fragments), Rules (`rules`, the custom element) |
| Controller | Actions, APIs (`apis`), Events (`events`), Rules (`rules`, the sidecar) |

| Visual | Source of Truth |
| --- | --- |
| `apis` | The custom element routes and services, and the `liferay-one-etc-spring-boot` controllers and OAuth2 scopes |
| `environment-drift` | `liferay-one-batch/batch/00` to `05`, the environment snapshots that `yarn viz:env` writes, and the configuration in the sidecar properties, `configs/`, `docker-compose.yaml`, `LCP.json`, and the names in `.env` and `.env.local` |
| `events` | Object actions in the batch files and the site initializer, every `client-extension.yaml`, and the sidecar scheduled jobs, subscribers, and controllers |
| `object-model` | `liferay-one-batch/batch/00` to `05`, `expando-columns.json`, and the site initializer object actions |
| `pages` | The `layouts`, `layout-page-templates`, `fragments`, and `site-navigation-menus.json` of the site initializer, and the custom element routes |
| `permission-matrix` | `resource-permissions.json`, the role batch, `RoleConstants.java`, the `project-contacts-role-ercs` specification of the seed products, and the sidecar and custom element sources that name a role |
| `rules` | `liferay-one-custom-element/src` and the `liferay-one-etc-spring-boot` source, scanned for the rules in `.agents/rules` that a pattern can check |
| `test-coverage` | `specs/` and `tests/plan/`, read by the parsers in `tests/scripts/lib` |
| `workspace-health` | The actions of every visual, the `liferay-one-custom-element` source, its last build, and its language files, the `package.json` files, `yarn.lock`, the `build.gradle` files, the test sources and run history, `git log`, and `specs/` |

## Build

```bash
yarn viz                 # Build every visual into tools/visuals/build/
yarn viz model           # Build the page that shows a visual or a layer
yarn viz:check           # Report drift and exit 1 when there is any
yarn viz --ref v1.2      # A snapshot of a branch, a tag, or a commit hash
yarn viz --base A        # A comparison of the working tree with ref A
yarn viz --base A --ref B  # A comparison of ref B with ref A
yarn viz:diff [A] [B]    # The same comparison, then a list of the new and resolved actions
```

`VIZ_BUILD_DIR` writes the pages to another directory, so two builds can run at the same time.

`environment-drift` compares the batch with running environments, and the build never calls an environment. Read each environment first. A snapshot holds the schema only, and it is not committed:

```bash
yarn viz:env stack uat               # The environments in environment-drift/environments.json
yarn viz:env one-lpd-12345=https://one-lpd-12345.stack
```

`workspace-health` reads the latest versions and the known vulnerabilities from a snapshot, for the same reason. Run `yarn viz:deps` to refresh it from the npm registry, Maven Central, and the OSV database. Its Tests section finds flaky tests in a run history: after a test run, run `yarn viz:tests` to add the JUnit results of Playwright, Vitest, and the Spring Boot tests to it.

Open `tools/visuals/build/index.html` in a browser. The `build/` directory is not committed.

## Layout

```
tools/visuals/
	build.ts        Runs each extractor and puts its data into its template
	lib.ts          Paths and file readers that the extractors share
	theme.css       The shared look: fonts, colors, and common components
	highlight.js    Finds and highlights the item that a link names, on every page
	visuals.json    Each page: its title, description, icon, and published URL. A layer names its page in `page`, and its tabs show inside that page
	compose.ts      Puts each visual inside a page as a section, with its CSS and script scoped to the section
	changes.ts      Compares the items of a visual at the base and the head of a comparison
	checkout.ts     Resolves a ref and checks it out into a temporary sparse worktree
	diff.ts         Builds a comparison and lists the actions that the head adds and resolves
	known-defects.json  Code defects that the check reports, each with its ticket or audit ID
	<name>/
		extract.ts      Reads the source and returns {data, problems}
		changes.ts      Lists the items that a comparison can find added, changed, or removed
		template.html   The page. Its script has const DATA = __DATA__;
		*.json          Hand-maintained input, such as findings or a narrative
```

The extractor and the template are separate. Change the template to change how a page looks. Change the extractor only when the source format changes.

Each visual shows the current state of the code, and nothing else. What needs attention goes to the Actions tab of `workspace-health`: every problem and known defect that the build finds, and every action that an extractor returns in `actions`, such as a finding in `object-model/findings.json`, an audit flag in `apis/config.json`, or a risky grant. Do not add an audit or attention section to a visual page. Return an action from its extractor instead.

Every page has the same look because the build puts the fonts and `theme.css` right after each template's `<title>`. A template holds only its layout, its own components, and the colors of its own categories, such as the object domains or the HTTP methods, and it maps its status colors onto the shared ones (`--critical`, `--high`, `--medium`, `--low`, `--ok`, `--info`, `--quiet`). Change `theme.css` to change every page. Do not copy its rules into a template.

The Go-Live Tasks artifact is not built from this repository, so it holds a copy of `theme.css` between its `theme:start` and `theme:end` comments. After you change `theme.css`, replace that copy and republish the artifact.

## Drift

Some input cannot come from the code: the domain of each object, a written finding, or the steps of a flow. That input lives in JSON files next to the extractor, and the extractor checks each reference in it against the code. A problem means one of two things. The JSON names something that no longer exists, or a finding says the opposite of what the code does: update the JSON. Or the code has a defect that the extractor can see, such as an object action with no handler: fix the code, and do not edit the check to hide it. `yarn viz:check` lists each problem and names the file to change.

`known-defects.json` lists the code defects that the team already knows about, each with a ticket or audit ID. A listed defect does not fail the check. When the defect is fixed, the check fails until you remove its entry, so the list never keeps a fixed defect.

`yarn viz` prints every problem as a warning and still builds the pages. Only `yarn viz:check` exits 1.

## Publish

Run `/one-viz`. It builds every visual, helps fix drift, and publishes each page to the claude.ai artifact URL in `visuals.json`, so a shared link always shows the latest build.

## Workspace Report as a Tool

The Overview shows each layer's open actions, how old each snapshot is, and the triage queue: the open actions that no ticket, audit ID, or known defect tracks. Each layer tab can filter to the triage queue, copy the actions it shows as Markdown for a ticket, and link to the source of each action on GitHub (`VIZ_GITHUB_REF` sets the branch, `master-temp` by default).

Each action links to the place that shows it. An action can name `anchor`, the id of a section in its tab, and `item`, the text that names the thing inside that section, such as an endpoint, a variable, or an object. The link opens the layer tab and the section, finds the element that shows the item, scrolls to it, and highlights it. When a filter on the page hides the item, the page gets a `viz-find` event with the item, and it can clear the filter. The permission matrix and the APIs tab do this. Give an action an `item` whenever one row on the page shows it.

Each standalone page has a tab icon: a letter on the color of the page, set in `ICONS` in `build.ts`.

## Snapshot and Comparison

Without `--base`, the page is a **snapshot**: the workspace at its head, which is the working tree or the ref that `--ref` names. The scope bar under the title names the ref, its commit and subject, and, in the working tree, the number of uncommitted files.

With `--base`, the page is a **comparison**: what the head adds to the base, from their merge base, as on a GitHub compare page. The build reads every visual at the merge base too, with `build.ts --data`, and compares the two:

- Each action that the head adds is marked new, and each one that it resolves is listed. A number in an action's title does not count, so a count that grows is not a new action.
- Each visual that lists its items in `<visual>/changes.ts` gets `__changes` in its data. Its section starts with a change bar: the new, changed, and removed counts, the removed items, and an Only Changed switch, which is on when anything changed. The visual marks each new or changed item with `vizChangeBadge` and filters on `vizOnlyChanged`. At a snapshot, `__changes` is absent and the visual looks as it always did.
- The Workspace sections show the deltas: the changed dependencies, the changed test files and the tests newly skipped or focused, the changed files by area with the hotspots they touch, and the changed specs with the names they make stale or fix.
- When the head is a feature branch, the Overview ends with the lifecycle.

| Section | Snapshot | Comparison |
| --- | --- | --- |
| Snapshot ages | Shown | Hidden, because they say nothing about the change |
| Test runs, flaky and slow tests | Shown, with a note at a ref | Hidden: the run history has no base |
| Custom element build | Shown, with a note at a ref | Hidden: the build exists only in the working tree |
| Environment drift table | Shown | Not marked: the environment snapshots are the same at both refs |

The test runs, the environment and dependency snapshots, and the custom element build are not committed, so they always come from the working tree.

## Lifecycle

The lifecycle shows only in a comparison whose head is a feature branch, a ref whose name starts with `feature-`, at the end of the Overview. It replaces the traditional deliverable of each phase with an artifact that the workspace makes. In the working tree, a change that is not committed yet counts, and an untracked file counts as added.

| Phase | Traditional Deliverable | Agentic Artifact | Done When |
| --- | --- | --- | --- |
| Planning | Requirements document | `mockup.html` | The comparison adds a file whose name contains `mockup` and ends in `.html`. A change that does not touch the user interface needs no mockup. |
| Analysis | Requirements specification | `git diff specs/business` | The comparison changes a business spec. A code change with no business spec change shows Check. |
| Design | Architecture specification | `git diff specs/technical` | The comparison changes a technical spec. A code change with no technical spec change shows Check. |
| Implementation | Code commits | `git diff client-extensions` | The comparison changes a client extension. A spec change with no code change shows Missing. |
| Testing | Test reports | `yarn test:report` | The Playwright report is newer than the latest change, no recorded test fails, and the change includes a test with its code. |
| Deployment | Release report | `yarn viz:diff` | The comparison adds no action. New actions show Check. |
| Maintenance | Performance report | `yarn viz` | Every snapshot is at most 7 days old and every new action is tracked. |

A phase with no change shows No change. At a ref, Testing shows Unknown, because the Playwright report and the recorded test runs belong to the working tree. When the head has no commits that the base lacks, the scope bar says that the refs are probably swapped.

## Any Ref

Every ref is a branch, a tag, or a commit hash, and any two can be compared. `--ref` checks the ref out into a temporary sparse worktree that holds only this workspace, runs the current extractors and templates against it, and removes the worktree. Each visual reads that ref's own hand-maintained input, such as `config.json` and `findings.json`, and the input of the current checkout when the ref predates the file. A ref that predates a visual can fail its extractor, and its section then says that it could not compare. A ref that has no `workspaces/liferay-one-workspace` stops the build with a message.

The change hotspots end at the ref's commit, and each source link names that commit on GitHub.