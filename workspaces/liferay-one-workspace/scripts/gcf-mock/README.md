# DataOps Metrics API Mock

Fakes the Liferay Data Platform Metrics API so the LDP usage endpoints on
`liferay-one-etc-spring-boot` can be exercised in the local k3s harness, without GCP
credentials and without a deployed Cloud Function.

## Why This Is Needed

`GoogleCloudFunctionService` authenticates before it makes a request. `_getIdTokenProvider`
calls `(IdTokenProvider)GoogleCredentials.getApplicationDefault()`, so with no application
default credentials present it throws `GoogleCloudFunctionUnavailableException`,
`ProjectRestController` logs "Unable to reach the DataOps usage API" and returns null, and
the request never leaves the pod. Stubbing HTTP alone therefore changes nothing.

The way through is `GCE_METADATA_HOST`. Both `DefaultCredentialsProvider` and
`ComputeEngineCredentials` honor it, so pointing it at the mock makes the credential chain
resolve to `ComputeEngineCredentials`, which fetches an ID token over plain unauthenticated
HTTP. The mock serves that token alongside the usage endpoints.

Two details are easy to get wrong:

1. The availability probe requires a `Metadata-Flavor: Google` response header.

1. `IdTokenCredentials.refresh` parses the returned token as a JWT to read `exp`, so an
opaque string fails. The `Caddyfile` serves a well-formed unsigned JWT whose signature is
never verified.

## Payload Provenance

The response bodies follow the **0.1.1 - Liferay Data Platform Metrics API Contract** page in
the Data Operations Confluence space, linked from DOPS-3607. The counts are made up; the
field names, nesting, and status codes are the documented contract. Update the `Caddyfile`
whenever that contract changes.

## How It Is Wired

The mock is the `liferay-one-gcf-mock` client extension, so the normal workspace flow builds
and deploys it. Its `Dockerfile` runs `mock/generate-fixtures.sh` during the build and Caddy serves the
result, so the served responses are generated at image build time and never committed. The
Caddy image already carries bash, so no extra build stage is needed.

Redirecting the DataOps calls at it takes two overrides:

```
GCE_METADATA_HOST=liferay-one-gcf-mock:80
LIFERAY_ONE_GCF_BASE_URL=http://liferay-one-gcf-mock
```

`configure-local.sh` writes them to the gitignored root `.env.local`, which is the channel
the `one-deploy` skill documents: it is read after `build/local.env`, so it wins.

```bash
./configure-local.sh          # then rebuild or recreate the environment
./verify.sh
./configure-local.sh --remove
```

## The Two Environments

**docker compose.** `.env.local` is already listed as a second `env_file` on
`liferay-one-etc-spring-boot`, so the overrides apply as soon as the container is recreated.
Compose does not run container client extensions at all — there is no kong service there
either — so `configure-local.sh` also declares the mock as a service in the gitignored
`docker-compose.override.yaml`.

No pod-IP handling is needed here because the client extension runs with
`network_mode: service:liferay`: it shares the portal's network namespace, which is also why
`.serviceAddress: localhost:8080` works there without the socat sidecar the k3s pods need.
The same sharing means it inherits compose's resolver, so the mock resolves by name. The
client extension publishes 58081 on the portal container, so `verify.sh` reaches it from the
host.

**k3s (the LEC harness).** The recipe deploys any directory carrying an `LCP.json`, so the
client extension needs nothing extra. The staging step originally copied only
`build/local.env` as the pod's env, which meant the documented `.env.local` override channel
silently did nothing here; `setup-lec-one-test-k3s.sh` now appends `.env.local` onto the
staged file. The recipe reads that file line by line into a map, so the appended entries win,
matching compose's precedence.

Addressing the mock by service name in this harness depends on Service DNS, which did not
resolve when it was last checked. The likely cause is ClusterIP routing rather than DNS
itself, since the pod resolver points at the kube-dns ClusterIP — worth confirming before
assuming a name will work.

## Editing The Data

All the numbers live in a data block at the top of `mock/generate-fixtures.sh`: the ten
monthly event buckets as `MONTHS` rows of month, Liferay count and Salesforce count, then the
four summary metrics and the project identifiers. The script derives every served response
from that block, so the per-month `event-summary-*.json` files and the nested buckets inside
`event-history.json` cannot drift apart -- each month's counts would otherwise have to be
written twice.

A month left out of `MONTHS` returns zero counts from event-summary and no bucket from
event-history, which is how the deliberate 2026-01 and 2026-04 gaps work.

Entitlement caps are deliberately **not** here. Those come from the seeded orders, so the
percentages the UI shows are mock usage over real entitlements.

Rebuild the client extension image after editing.

## This Never Reaches A Deployed Environment

The directory sits under `scripts/`, a workspace-level sibling of `client-extensions/`. The
workspace only assembles and deploys client extensions, so nothing here is built, packaged,
or applied by the build or by CI. The manifests take effect only when `deploy.sh` is run by
hand.

`deploy.sh` additionally refuses to run when either guard trips:

1. The local k3s container is absent.

1. `LIFERAY_ONE_GCF_BASE_URL` on the client extension already points at an `https://` URL,
which would mean a real Cloud Function is configured.

## Harness Limitations

Service DNS and ClusterIP routing both fail in this k3s-in-docker setup, so only pod IPs
route. Kubelet probes reach pods directly, which means pods still report Ready and
`kubectl get endpoints` looks healthy while pod-to-pod Service traffic times out. This is
also why the client extensions reach Liferay through a `liferay-proxy` socat sidecar on
`localhost` instead of a Service.

Pod IPs change on every rollout, so `deploy.sh` re-resolves the mock address and re-points
the client extension on each run. Restarting the mock alone leaves a stale address behind;
run `deploy.sh` again rather than restarting the Deployment by hand.