#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# Re-provision the liferay-one-etc-spring-boot OAuth applications so their
# redirect URIs pick up virtual hosts that were bound after the client extension
# was first deployed, and restart the Spring Boot sidecar so it re-reads the
# refreshed route configuration.
#
# The user-agent application (liferay-one-etc-spring-boot-oaua) derives its
# redirect URIs from the company's virtual hosts at provision time, in
# OAuth2ProviderApplicationUserAgentConfigurationFactory.doActivate. The hostname
# is captured literally there -- only the protocol and port are interpolated at
# runtime -- so a host bound afterward never appears in the stored redirect URIs.
# During bootstrap the client extension is provisioned before set_virtual_hosts.sh
# binds one.localhost to the One site, so the application is created with only the
# localhost redirect URI. Browsing the site at its domain root then fails the
# SPA's Liferay.OAuth2.FromUserAgentApplication lookup with "No redirectURI
# matching origin http://one.localhost:8080".
#
# Redeploying the client extension re-fires the configuration factories, which
# re-read getVirtualHosts(companyId) -- now including one.localhost -- update the
# applications' redirect URIs in place through the service layer (the client id
# and secret are reused), and rewrite the OAuth route files on the shared routes
# volume. --rerun-tasks is required: without it Gradle treats
# createClientExtensionConfig as up to date and reuses the previous build
# timestamp, the redeployed config is byte-identical, and the config bundle
# tracker never re-activates the factories.
#
# The Spring Boot sidecar builds its OAuth client registrations once, from the
# route files, at startup -- wait-for-routes.sh only gates on the DXP route, not
# on the etc-spring-boot routes, so a sidecar that started before its routes were
# written comes up without the liferay-one-etc-spring-boot-oahs registration and
# every server-to-server call fails with "Could not find ClientRegistration".
# docker compose up --detach is a no-op when the image is unchanged, so restart
# the sidecar explicitly here to force it to re-read the routes.
#
# The sidecar also derives its CORS allow list from the same route files, from
# com.liferay.lxc.dxp.domains, and the portal stamps its own listening port onto
# every virtual host it writes there: one.localhost:8080, not one.localhost. The
# compose file publishes the portal on both 80 and 8080, so the site answers at
# http://one.localhost, and that origin does not match the ported entry. Every
# browser call to the sidecar then fails its preflight with "Invalid CORS
# request", which surfaces as a page that renders but silently loses whatever the
# sidecar feeds it -- the activation keys screen keeps its table and drops the
# New Key button, because the button is gated on a generate-form response that
# never arrives. Add the unported form of each domain alongside the ported one so
# the site works at its domain root as well as on the explicit port.
#
# Run this after set_virtual_hosts.sh from every orchestrator that binds a
# virtual host: bootstrap.sh, instance_reset.sh, and site_reset.sh.

CONTAINER_NAME="liferay"

DXP_DOMAINS_FILE="/opt/liferay/routes/default/dxp/com.liferay.lxc.dxp.domains"

DXP_DOMAINS_FILE_ATTEMPTS=12

SIDECAR_SERVICE="liferay-one-etc-spring-boot"

SIDECAR_READY_URL="http://localhost:58081/ready"

function main {
	cd ../..

	local container_id

	container_id="$(docker ps --quiet --filter "name=^${CONTAINER_NAME}$")"

	if [[ -z ${container_id} ]]
	then
		echo "Unable to find a running \"${CONTAINER_NAME}\" container." >&2

		return 1
	fi

	./gradlew ":client-extensions:${SIDECAR_SERVICE}:deploy" \
		-Ddeploy.docker.container.id="${container_id}" \
		--rerun-tasks

	# The portal writes the route files asynchronously after the bundle is
	# deployed, so give the configuration factories a moment to run before the
	# sidecar re-reads them.

	echo "Waiting for the routes to settle."

	sleep 15

	_allow_unported_origins "${container_id}"

	echo "Restarting the Spring Boot client extension container."

	docker compose restart "${SIDECAR_SERVICE}"

	echo "Waiting for the Spring Boot client extension to be ready."

	local elapsed=0

	until curl --fail --max-time 5 --output /dev/null --silent "${SIDECAR_READY_URL}"
	do
		# Fail fast when the container has already exited: a crashed sidecar
		# never answers /ready, so without this the loop would burn the full
		# timeout before reporting a failure that happened in seconds. Dump the
		# tail of its log so the boot error (a missing property, an unresolved
		# route) is visible instead of a wall of dots.

		local status
		status=$(docker inspect --format "{{.State.Status}}" "${SIDECAR_SERVICE}" 2>/dev/null || echo "missing")

		if [ "${status}" != "running" ]
		then
			echo "The Spring Boot client extension exited before becoming ready (status: ${status})." >&2
			docker logs --tail 30 "${SIDECAR_SERVICE}" >&2 || true

			return 1
		fi

		if [ "${elapsed}" -ge 120 ]
		then
			echo "Timed out waiting for the Spring Boot client extension." >&2
			docker logs --tail 30 "${SIDECAR_SERVICE}" >&2 || true

			return 1
		fi

		printf '.'

		sleep 3

		elapsed=$((elapsed + 3))
	done

	echo " The Spring Boot client extension is ready."
}

function _allow_unported_origins {
	local container_id="${1}"

	echo "Allowing the unported form of each virtual host as a CORS origin."

	# The portal rewrites this file whenever the configuration factories run, so
	# this has to happen after the deploy above and before the sidecar restart
	# that re-reads it. Rewriting is idempotent: a domain already present, and a
	# domain that carries no port, are both left alone.

	local attempt=0

	while [ "${attempt}" -lt "${DXP_DOMAINS_FILE_ATTEMPTS}" ]
	do
		if docker exec "${container_id}" test -f "${DXP_DOMAINS_FILE}"
		then
			docker exec "${container_id}" sh -c "
				domains=\$(awk '{ print } { sub(/:[0-9]+\$/, \"\"); print }' ${DXP_DOMAINS_FILE} | awk 'NF && !seen[\$0]++')

				printf '%s\\n' \"\${domains}\" > ${DXP_DOMAINS_FILE}
			"

			return 0
		fi

		attempt=$((attempt + 1))

		sleep 5
	done

	# The CORS allow list is a convenience for browsing the site at its domain
	# root. Losing it costs the unported origin, not the provisioning run, so
	# warn and carry on rather than failing every orchestrator that calls this.

	echo "Unable to find the DXP domains route file. The unported origins were not allowed." >&2
}

main "${@}"