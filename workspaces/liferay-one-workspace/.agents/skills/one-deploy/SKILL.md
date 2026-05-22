---

allowed-tools: [Bash, Glob, Grep, Read]
description: Deploy `liferay-one-*` client extensions to the devcontainer Liferay. Use when the user asks to deploy, run /deploy, or wants to push client extension changes.
name: one-deploy

---

# Deploy One Workspace Client Extensions

Deploy `liferay-one-*` client extensions to the Liferay Docker Compose setup. Pure SaaS — no `ant deploy`, no portal-core changes.

## 1. Pre-flight

```bash
./gradlew formatSource build
```

Stop and report if either step fails. Do not deploy a failing build.

## 2. Resolve Target

Valid targets: `liferay-one-custom-element`, `liferay-one-etc-spring-boot`, `liferay-one-global-css`, `liferay-one-instance-settings`, `liferay-one-site-initializer`, `all`.

Check `git diff --name-only` and pick every touched `client-extensions/liferay-one-*` directory. When multiple are touched, confirm with the user before proceeding.

## 3. Deploy

```bash
# Single
./gradlew :client-extensions:<name>:clean :client-extensions:<name>:deploy \
    -Ddeploy.docker.container.id=$(docker ps --filter "name=^liferay$" --quiet)

# All
./gradlew clean deploy \
    -Ddeploy.docker.container.id=$(docker ps --filter "name=^liferay$" --quiet)
```

`deploy` only builds each client extension's zip and copies it into the running `liferay` container. The other client extensions hot-deploy from there, but `liferay-one-etc-spring-boot` runs as its own Compose service off the `liferay-one-etc-spring-boot:latest` image — `deploy` does not rebuild that image or restart its container, so the running app keeps serving old code. When `liferay-one-etc-spring-boot` is among the deployed targets, rebuild the image and recreate the container so the running app picks up the new code:

```bash
./gradlew :client-extensions:liferay-one-etc-spring-boot:buildDockerImage
docker compose up --detach --force-recreate liferay-one-etc-spring-boot
```

`buildDockerImage` also regenerates `build/local.env` — every `${...}` placeholder in `application-default.properties` becomes `VAR=unused` — so the same step repairs a `build/local.env` that a prior `gradlew clean` removed. To supply real integration values or toggle a feature (for example, enabling the Salesforce object subscriber) so they survive rebuilds, set those overrides in the gitignored root `.env.local` (read after `build/local.env`, so it wins) rather than editing `build/local.env` directly, then recreate the container.

Report: what was deployed, Gradle result, and log evidence of pickup.