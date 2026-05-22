---

allowed-tools: [Bash, Glob, Grep, Read]
description: Fully reset the local Liferay Docker environment — tears down all containers and volumes, then bootstraps a fresh environment from scratch.
name: one-env-reset

---

# Reset Liferay One Environment

Run from `workspaces/liferay-one-workspace/`.

Wipes everything and starts fresh. Use this to recover from a broken environment or after schema changes that require a clean slate.

## 1. Bootstrap with Reset

Run `scripts/bootstrap.sh --reset`. The `--reset` flag tears down all containers and wipes all volumes first, then builds the Docker image, tags it, starts the containers, waits for Liferay to be healthy, and deploys the client extensions.

```bash
scripts/bootstrap.sh --reset
```

Liferay is ready when it prints `Done. Liferay is running at http://localhost:8080.`

## 2. Recreate Auth App

A volume wipe destroys all OAuth2 applications. After bootstrap completes, run `/one-oauth-app` to recreate the local-dev OAuth2 app.