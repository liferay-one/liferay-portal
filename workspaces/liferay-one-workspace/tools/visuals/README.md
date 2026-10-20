# Workspace Visuals

Interactive HTML pages that show the structure of this workspace. Each page is built from the source files, so a rebuild shows the current code.

One page: Workspace Health. It has a tab for each layer of the workspace. A layer tab starts with the actions of the layer, then has a section for each visual in it.

| Workspace Health Tab | Sections, each a visual in `tools/visuals/<visual>` |
| --- | --- |
| Overview | The open actions of each layer, the age of each snapshot, and the triage queue |
| Workspace | Actions, Bundle (the dependencies and the custom element build), Tests (the test runs, then the test plan coverage of `test-coverage`), Changes, and Specs |
| Model | Actions, Objects (`object-model`), Access (`permission-matrix`), Environments (`environment-drift`), Rules (`rules`, the batch files) |
| View | Actions, Pages (`pages`), Components (`pages`, the fragments), Rules (`rules`, the custom element) |
| Controller | Actions, APIs (`apis`), Events (`events`), Rules (`rules`, the sidecar) |

| Visual | Source of Truth |
| --- | --- |
| `apis` | The custom element routes and services, and the `liferay-one-etc-spring-boot` controllers and OAuth2 scopes |
| `environment-drift` | `liferay-one-batch/batch/00` to `05`, the environment snapshots that `yarn viz:env` writes, and the configuration in the sidecar properties, `configs/`, `docker-compose.yaml`, `LCP.json`, and the names in `.env` and `.env.local` |
| `events` | Object actions in the batch files and the site initializer, every `client-extension.yaml`, and the sidecar scheduled jobs, subscribers, and controllers |
| `object-model` | `liferay-one-batch/batch/00` to `05`, `expando-columns.json`, and the site initializer object actions |
| `pages` | The `layouts`, `layout-page-templates`, `fragments`, and `site-navigation-menus.json` of the site initializer, and the custom element routes |
| `permission-matrix` | `resource-permissions.json` and the role batch |
| `rules` | `liferay-one-custom-element/src` and the `liferay-one-etc-spring-boot` source, scanned for the rules in `.agents/rules` that a pattern can check |
| `test-coverage` | `specs/` and `tests/plan/`, read by the parsers in `tests/scripts/lib` |
| `workspace-health` | The actions of every visual, the `liferay-one-custom-element` source, its last build, and its language files, the `package.json` files, `yarn.lock`, the `build.gradle` files, the test sources and run history, `git log`, and `specs/` |

## Build

```bash
yarn viz                 # Build every visual into tools/visuals/build/
yarn viz model           # Build the page that shows a visual or a layer
yarn viz:check           # Report drift and exit 1 when there is any
```

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
	diff.ts         Lists the actions that the current branch adds to its base
	known-defects.json  Code defects that the check reports, each with its ticket or audit ID
	<name>/
		extract.ts      Reads the source and returns {data, problems}
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

## Workspace Health as a Tool

The Overview shows each layer's open actions, how old each snapshot is, and the triage queue: the open actions that no ticket, audit ID, or known defect tracks. Each layer tab can filter to the triage queue, copy the actions it shows as Markdown for a ticket, and link to the source of each action on GitHub (`VIZ_GITHUB_REF` sets the branch, `master-temp` by default).

Each action links to the place that shows it. An action can name `anchor`, the id of a section in its tab, and `item`, the text that names the thing inside that section, such as an endpoint, a variable, or an object. The link opens the layer tab and the section, finds the element that shows the item, scrolls to it, and highlights it. When a filter on the page hides the item, the page gets a `viz-find` event with the item, and it can clear the filter. The permission matrix and the APIs tab do this. Give an action an `item` whenever one row on the page shows it.

Each standalone page has a tab icon: a letter on the color of the page, set in `ICONS` in `build.ts`.

Run `yarn viz:diff [base]` before a review. It checks out the base, which defaults to the merge base with `liferay-one/master-temp`, runs the extractors against it, and writes `build/diff.json`. The next `yarn viz workspace-health` marks each action that the branch adds, and lists the ones it resolves. A number in an action's title does not count, so a count that grows is not a new action.