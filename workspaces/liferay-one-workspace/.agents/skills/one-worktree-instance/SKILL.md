---

allowed-tools: [Bash, Glob, Grep, Read]
description: Give a worktree its own database partitioned virtual instance on the shared local Liferay server — create, provision, deploy to, and delete one instance per worktree. Use when several worktrees need isolated Liferay environments at the same time, without one Docker stack each.
name: one-worktree-instance

---

# One Virtual Instance per Worktree

Run from the `workspaces/liferay-one-workspace/` directory of the worktree that owns the instance.

One local Liferay server holds one virtual instance per worktree. Database partitioning is on, so each instance keeps its data in its own Postgres schema (`lpartition_<company ID>`) and its own search indexes (`liferay-<company ID>`). A second worktree costs one schema and one Spring Boot sidecar, not a second 10 GB stack.

| Address | Serves |
| --- | --- |
| `http://<subdomain>.localhost` | The One site of the instance |
| `http://admin.<subdomain>.localhost` | The instance (control panel, headless APIs) |
| `http://localhost:<port>` | The Spring Boot sidecar of the instance, port 58082 to 58099 |

Use the ticket key in lowercase as the web ID, for example `lpd-12345`. The subdomain is the web ID unless `LIFERAY_INSTANCE_SUBDOMAIN` sets another one. `LIFERAY_INSTANCE_DOMAIN` replaces `localhost` for a server on another machine, `LIFERAY_SERVER_URL` sets the address of that server (default `http://localhost:8080`), and `LIFERAY_INSTANCE_INTERNAL_PORT` sets the port that the sidecar uses to call its instance (default `:8080`, empty when the instance host resolves to a proxy). Both hosts must reach the server on port 80.

## Prerequisite

The shared server must run with database partitioning on. Partitioning is set in `configs/local/portal-ext.properties` and takes effect only on an empty database, so a server that was bootstrapped before it needs `/one-env-reset` once. The default instance stays where it is, at `http://localhost:8080` and `http://one.localhost:8080`.

## Commands

```bash
scripts/instance.sh list
scripts/instance.sh provision <web ID>
scripts/instance.sh deploy <web ID> [client extension ...]
scripts/instance.sh sidecar <web ID>
scripts/instance.sh delete <web ID>
scripts/instance.sh create <web ID>
```

- `provision` creates an empty instance and gives it everything `bootstrap.sh` gives the default instance: the client extensions of this worktree, the One site host, the Spring Boot sidecar, the redirect entries, the payment methods, the DXP connector OAuth2 application, and the seed data. It takes about 8 minutes.
- `deploy` redeploys client extensions after a code change. With no names, it deploys the global CSS, instance settings, custom element, batch, and site initializer client extensions, in that order. Name `liferay-one-etc-spring-boot` to rebuild the sidecar. The site initializer runs only when the One site does not exist yet, so apply a site initializer change with `delete` and `provision`.
- `sidecar` restarts the Spring Boot sidecar, for example after the `liferay` container is recreated.
- `delete` removes the instance, its schema, its client extension zips, its sidecar, and its sidecar image.

## How the Isolation Works

`deploy` builds each client extension with `-Pliferay.virtual.instance.id=<web ID>`. The workspace plugin then suffixes the zip, the bundle symbolic name, and the `/o/<project>_<web ID>` web context with the web ID, and scopes every configuration to the instance (the configuration PID becomes `~<external reference code>/<web ID>`). External reference codes do not change, so the site initializer and the batch files work as they are.

The Spring Boot image always builds as `liferay-one-etc-spring-boot:latest`, which the default sidecar runs. `deploy` tags the new image as `:<web ID>` and puts the previous image back on `:latest`. It also replaces `localhost:58081` in the OAuth2 application configurations of the zip with the port of the instance, and starts the sidecar in the network namespace of the `liferay` container with the routes of the instance (`/opt/liferay/routes/<web ID>`).

## Settings This Needs

- `company.administrator.can.publish` in `WorkflowDefinitionConfiguration`. Only an omniadmin can deploy workflow definitions, and the administrator of a nondefault instance is not an omniadmin. Without this setting the site initializer fails with `MustHavePermission ... ADD_DEFINITION`.
- Ports 58082 to 58099 published on the `liferay` container, so that a browser can reach each sidecar.

## Expected Log Noise

- `Unable to iterate over the following company IDs ... because company ID ... is locked` during a batch import. Only `IndexOnStartupExecutor` is affected, and the objects are new, so nothing is left unindexed.
- `Unable to get client ID: 400 Bad Request` and JSM `404 Not Found` in the sidecar log. The default sidecar logs the same lines.

## Limits

- Portal properties, feature flags, OSGi configurations under `configs/`, the Dockerfile, and the hotfix apply to every instance. A branch that changes one of them needs its own environment (`/one-worktree` in a slot, or `/one-env-reset`).
- The waits read the shared `liferay` log, so run one `provision` or `deploy` at a time.
- One JPDA port serves every instance. A breakpoint stops requests from all worktrees.

## Why Not Copy a Seeded Instance

`CompanyLocalService.copyDBPartitionCompany` copies a partition in about 2 minutes and reindexes the new company by itself. On 2026.Q1 it needs `feature.flag.LPD-11342` and has no REST endpoint (LPD-92623 removes the gate and adds `POST /o/headless-portal-instances/v1.0/portal-instances/copy`). The copy rewrites every `companyId` column, but not the company ID inside a client extension portlet ID such as `ClientExtensionEntryPortlet_<company ID>_LXC_liferay_one_custom_element`. The pages of the copied One site then point at the portlet of the source instance, and the custom element does not render. Recreating the site and the site data after the copy costs about as much as `provision`, so `provision` is the supported path.