---

allowed-tools: [Bash]
description: Stop the local Liferay Docker containers while keeping volumes intact.
name: one-env-down

---

# Stop Liferay One Environment

Run from `workspaces/liferay-one-workspace/`.

Stops all containers — the portal, the database, and the `liferay-one-etc-spring-boot` client extension — but preserves volumes so the next `/one-env-up` resumes where it left off.

```bash
docker compose stop
```