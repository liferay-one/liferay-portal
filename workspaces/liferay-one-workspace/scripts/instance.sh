#!/usr/bin/env bash

#
# Runs one database partitioned virtual instance per worktree on the shared
# Liferay server. The One site answers on http://<subdomain>.<domain> and the
# instance on http://admin.<subdomain>.<domain>. The subdomain defaults to the
# web ID (LIFERAY_INSTANCE_SUBDOMAIN) and the domain to localhost
# (LIFERAY_INSTANCE_DOMAIN). Both hosts must reach the server on port 80.
#
# The sidecar calls its instance through the Liferay container's network, at
# the instance host plus LIFERAY_INSTANCE_INTERNAL_PORT (default :8080). Set it
# to an empty string when the instance host resolves to a proxy instead.
#
# Client extensions are built with -Pliferay.virtual.instance.id=<web ID>, so
# the workspace plugin suffixes the zip, the bundle symbolic name, and the web
# context path with _<web ID> and scopes every configuration to that instance.
# The Spring Boot client extension also runs as its own sidecar container per
# instance, on a port from the range that docker-compose.yaml publishes.
#

ADMIN_CREDENTIALS="test@liferay.com:test"
CONTAINER_NAME="${LIFERAY_CONTAINER_NAME:-liferay}"
DEFAULT_CLIENT_EXTENSIONS=(
	liferay-one-global-css
	liferay-one-instance-settings
	liferay-one-custom-element
	liferay-one-batch
	liferay-one-site-initializer
)
INSTANCE_DOMAIN="${LIFERAY_INSTANCE_DOMAIN:-localhost}"
INSTANCE_INTERNAL_PORT="${LIFERAY_INSTANCE_INTERNAL_PORT-:8080}"
PORTAL_INSTANCES_URL="${LIFERAY_SERVER_URL:-http://localhost:8080}/o/headless-portal-instances/v1.0/portal-instances"
SIDECAR_FIRST_PORT=58082
SIDECAR_IMAGE="liferay-one-etc-spring-boot"
SIDECAR_LAST_PORT=58099
SPRING_BOOT_CLIENT_EXTENSION="liferay-one-etc-spring-boot"

function main {
	cd "$(dirname "${BASH_SOURCE[0]}")/.." || return 1

	local command=${1:-list}

	shift

	case "${command}" in
		create)
			_create "${@}"
			;;
		delete)
			_delete "${@}"
			;;
		deploy)
			_deploy "${@}"
			;;
		list)
			_list
			;;
		provision)
			_provision "${@}"
			;;
		sidecar)
			_start_sidecar "${@}"
			;;
		*)
			_print_help

			return 1
			;;
	esac
}

function _call_api {
	local data=${3:-}
	local method=${1}
	local path=${2}

	local arguments=(
		--header "Content-Type: application/json"
		--request "${method}"
		--show-error
		--silent
		--url "${PORTAL_INSTANCES_URL}${path}"
		--user "${ADMIN_CREDENTIALS}"
		--write-out "\nHTTP %{http_code}\n"
	)

	if [ -n "${data}" ]
	then
		arguments+=(--data "${data}")
	fi

	curl "${arguments[@]}"
}

function _configure {
	local web_id=${1}

	(
		export DXP_OAUTH_REDIRECT_URIS="$(_get_url "${web_id}")/authorize http://$(_get_site_host "${web_id}")/authorize http://$(_get_site_host "${web_id}"):8080/authorize"
		export LIFERAY_ADMIN_EMAIL=test@liferay.com
		export LIFERAY_ADMIN_PASSWORD=test
		export LIFERAY_AUTH_MODE=basic
		export LIFERAY_ENV_FILE=/dev/null
		export LIFERAY_URL=$(_get_url "${web_id}")

		./scripts/bootstrap/set_redirect_entries.sh &&
		./scripts/bootstrap/set_payment_methods.sh &&
		./scripts/bootstrap/create_dxp_oauth_application.sh
	)
}

function _create {
	local web_id=${1:?Set the web ID.}

	_call_api POST "" "$( \
		jq \
			--arg virtual_host "$(_get_instance_host "${web_id}")" \
			--arg web_id "${web_id}" \
			--null-input \
			'{admin: {emailAddress: "test@liferay.com", familyName: "Test", givenName: "Test"}, domain: "liferay.com", portalInstanceId: $web_id, virtualHost: $virtual_host}')"
}

function _delete {
	local web_id=${1:?Set the web ID.}

	docker rm --force "$(_get_sidecar_name "${web_id}")" &> /dev/null

	docker rmi "${SIDECAR_IMAGE}:${web_id}" &> /dev/null

	docker exec "${CONTAINER_NAME}" sh -c "rm -f /opt/liferay/osgi/client-extensions/*_${web_id}.zip"

	_call_api DELETE "/${web_id}"
}

function _deploy {
	local web_id=${1:?Set the web ID.}

	shift

	local client_extensions=("${@}")

	if [ "${#client_extensions[@]}" -eq 0 ]
	then
		client_extensions=("${DEFAULT_CLIENT_EXTENSIONS[@]}")
	fi

	local client_extension

	for client_extension in "${client_extensions[@]}"
	do
		if [ "${client_extension}" == "${SPRING_BOOT_CLIENT_EXTENSION}" ]
		then
			_deploy_spring_boot "${web_id}" || return 1

			continue
		fi

		echo "Deploying ${client_extension} to ${web_id}."

		local has_site="false"

		if [ "${client_extension}" == "liferay-one-site-initializer" ] && _has_site "${web_id}"
		then
			has_site="true"
		fi

		local since

		since=$(date +%s)

		./gradlew \
			":client-extensions:${client_extension}:deploy" \
			-Ddeploy.docker.container.id="$(_get_container_id)" \
			-Pliferay.virtual.instance.id="${web_id}" \
			--quiet || return 1

		if [ "${client_extension}" == "liferay-one-batch" ]
		then
			_wait_for_batch_imports "${since}" || return 1
		elif [ "${client_extension}" == "liferay-one-site-initializer" ]
		then
			if [ "${has_site}" == "true" ]
			then
				echo "The One site of ${web_id} exists, so the site initializer does not run again. Delete the instance and provision it again to apply site initializer changes."
			else
				_wait_for "_has_log_since ${since} BundleSiteInitializer.*Initialized.One.for.group" 600 || return 1
			fi
		fi
	done
}

function _deploy_spring_boot {
	local web_id=${1}

	local port

	port=$(_get_sidecar_port "${web_id}")

	if [ -z "${port}" ]
	then
		echo "No free sidecar port between ${SIDECAR_FIRST_PORT} and ${SIDECAR_LAST_PORT}." >&2

		return 1
	fi

	echo "Deploying ${SPRING_BOOT_CLIENT_EXTENSION} to ${web_id} on port ${port}."

	#
	# The image build always tags :latest, which the default instance's compose
	# service runs, so tag the new image per instance and put :latest back.
	#

	local previous_image

	previous_image=$(docker image inspect --format "{{.Id}}" "${SIDECAR_IMAGE}:latest" 2> /dev/null)

	./gradlew \
		":client-extensions:${SPRING_BOOT_CLIENT_EXTENSION}:buildClientExtensionZip" \
		":client-extensions:${SPRING_BOOT_CLIENT_EXTENSION}:buildDockerImage" \
		-Pliferay.virtual.instance.id="${web_id}" \
		--quiet \
		--rerun-tasks || return 1

	docker tag "${SIDECAR_IMAGE}:latest" "${SIDECAR_IMAGE}:${web_id}"

	if [ -n "${previous_image}" ]
	then
		docker tag "${previous_image}" "${SIDECAR_IMAGE}:latest"
	fi

	local zip_file="client-extensions/${SPRING_BOOT_CLIENT_EXTENSION}/dist/${SPRING_BOOT_CLIENT_EXTENSION}_${web_id}.zip"

	_set_service_port "${port}" "${zip_file}" || return 1

	local client_id_file="/opt/liferay/routes/${web_id}/${SPRING_BOOT_CLIENT_EXTENSION}/${SPRING_BOOT_CLIENT_EXTENSION}-oahs.oauth2.headless.server.client.id"

	local previous_route

	previous_route=$(docker exec "${CONTAINER_NAME}" stat --format "%Y" "${client_id_file}" 2> /dev/null)

	docker cp "${zip_file}" "${CONTAINER_NAME}:/opt/liferay/osgi/client-extensions/" || return 1

	echo "Waiting for the routes of ${web_id} to be written."

	_wait_for "_has_new_route ${client_id_file} ${previous_route:-0}" 120 || return 1

	_start_sidecar "${web_id}"
}

function _get_container_id {
	docker ps --filter "name=^${CONTAINER_NAME}$" --quiet
}

function _get_instance_host {
	echo "admin.$(_get_subdomain "${1}").${INSTANCE_DOMAIN}"
}

function _get_internal_url {
	echo "http://$(_get_instance_host "${1}")${INSTANCE_INTERNAL_PORT}"
}

function _get_sidecar_name {
	echo "${SPRING_BOOT_CLIENT_EXTENSION}-${1}"
}

function _get_sidecar_port {
	local web_id=${1}

	local port

	port=$(docker inspect --format '{{index .Config.Labels "one.sidecar.port"}}' "$(_get_sidecar_name "${web_id}")" 2> /dev/null)

	if [ -n "${port}" ]
	then
		echo "${port}"

		return
	fi

	local used_ports

	used_ports=$(docker ps --all --filter "label=one.sidecar.port" --format '{{.Label "one.sidecar.port"}}')

	for ((port = SIDECAR_FIRST_PORT; port <= SIDECAR_LAST_PORT; port++))
	do
		if ! echo "${used_ports}" | grep --line-regexp --quiet "${port}"
		then
			echo "${port}"

			return
		fi
	done
}

function _get_site_host {
	echo "$(_get_subdomain "${1}").${INSTANCE_DOMAIN}"
}

function _get_subdomain {
	echo "${LIFERAY_INSTANCE_SUBDOMAIN:-${1}}"
}

function _get_url {
	echo "http://$(_get_instance_host "${1}")"
}

function _has_log_since {
	docker logs --since "${1}" "${CONTAINER_NAME}" 2>&1 | grep --extended-regexp --quiet "${2}"
}

function _has_new_route {
	local modified

	modified=$(docker exec "${CONTAINER_NAME}" stat --format "%Y" "${1}" 2> /dev/null)

	[[ "${modified:-0}" -gt "${2}" ]]
}

function _has_site {
	curl \
		--silent \
		--url "$(_get_url "${1}")/o/headless-admin-site/v1.0/sites?pageSize=200" \
		--user "${ADMIN_CREDENTIALS}" | \
		jq --exit-status '.items[]? | select(.externalReferenceCode == "LIFERAY_ONE")' > /dev/null
}

function _is_sidecar_ready {
	docker exec "${CONTAINER_NAME}" curl \
		--fail \
		--max-time 3 \
		--output /dev/null \
		--silent \
		"http://localhost:${1}/ready"
}

function _list {
	curl \
		--silent \
		--url "${PORTAL_INSTANCES_URL}" \
		--user "${ADMIN_CREDENTIALS}" | \
		jq --raw-output '.items[] | [.companyId, .portalInstanceId, .virtualHost, .active] | @tsv'
}

function _print_help {
	echo "Usage: scripts/instance.sh <command> [arguments]"
	echo ""
	echo "  create <web ID>"
	echo "  delete <web ID>"
	echo "  deploy <web ID> [client extension ...]"
	echo "  list"
	echo "  provision <web ID>"
	echo "  sidecar <web ID>"
}

function _provision {
	local web_id=${1:?Set the web ID.}

	_create "${web_id}" || return 1

	_deploy "${web_id}" || return 1

	_set_up "${web_id}" || return 1

	(
		export LIFERAY_ADMIN_EMAIL=test@liferay.com
		export LIFERAY_ADMIN_PASSWORD=test
		export LIFERAY_AUTH_MODE=basic
		export LIFERAY_ENV_FILE=/dev/null
		export LIFERAY_URL=$(_get_url "${web_id}")

		./scripts/seed.sh
	)

	echo "Done. The One site of ${web_id} is running at http://$(_get_site_host "${web_id}")."
}

function _set_service_port {
	local port=${1}
	local zip_file=${2}

	local config_file="${SPRING_BOOT_CLIENT_EXTENSION}.client-extension-config.json"
	local temp_dir

	temp_dir=$(mktemp --directory)

	unzip -q "${zip_file}" "${config_file}" -d "${temp_dir}" || return 1

	sed --expression "s/localhost:58081/localhost:${port}/g" --in-place "${temp_dir}/${config_file}"

	(cd "${temp_dir}" && zip -q "${OLDPWD}/${zip_file}" "${config_file}")

	rm --force --recursive "${temp_dir}"
}

function _set_up {
	local web_id=${1}

	#
	# The Spring Boot OAuth applications take their redirect URIs from the
	# virtual hosts that exist when they are deployed, so bind the One site
	# host first.
	#

	(
		export LIFERAY_ADMIN_EMAIL=test@liferay.com
		export LIFERAY_ADMIN_PASSWORD=test
		export LIFERAY_ENV_FILE=/dev/null
		export LIFERAY_ONE_VIRTUAL_HOST=$(_get_site_host "${web_id}")
		export LIFERAY_URL=$(_get_url "${web_id}")

		./scripts/bootstrap/set_virtual_hosts.sh
	) || return 1

	_deploy_spring_boot "${web_id}" || return 1

	_configure "${web_id}"
}

function _start_sidecar {
	local web_id=${1:?Set the web ID.}

	local port

	port=$(_get_sidecar_port "${web_id}")

	local name

	name=$(_get_sidecar_name "${web_id}")

	docker rm --force "${name}" &> /dev/null

	echo "Starting ${name} on port ${port}."

	docker run \
		--detach \
		--env "COM_LIFERAY_LXC_DXP_DOMAINS=$(_get_site_host "${web_id}"),$(_get_instance_host "${web_id}"),$(_get_site_host "${web_id}"):8080,$(_get_instance_host "${web_id}"):8080" \
		--env "LIFERAY_JAR_RUNNER_JAVA_OPTS=--add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED --add-opens=java.base/java.lang.reflect=ALL-UNNAMED --add-opens=java.base/java.net=ALL-UNNAMED" \
		--env "LIFERAY_ONE_PORTAL_URL=$(_get_internal_url "${web_id}")" \
		--env "LIFERAY_ROUTES_CLIENT_EXTENSION=/opt/liferay/routes/${web_id}/${SPRING_BOOT_CLIENT_EXTENSION}" \
		--env "LIFERAY_ROUTES_DXP=/opt/liferay/routes/${web_id}/dxp" \
		--env "SERVER_PORT=${port}" \
		--env-file "client-extensions/${SPRING_BOOT_CLIENT_EXTENSION}/build/local.env" \
		--env-file .env.local \
		--label "one.instance=${web_id}" \
		--label "one.sidecar.port=${port}" \
		--name "${name}" \
		--network "container:${CONTAINER_NAME}" \
		--volume "${COMPOSE_PROJECT_NAME:-liferay-stack}_liferay_routes:/opt/liferay/routes:ro" \
		--volume "${PWD}/client-extensions/${SPRING_BOOT_CLIENT_EXTENSION}/scripts/wait-for-routes.sh:/usr/local/bin/liferay_jar_runner_set_up.sh:ro" \
		"${SIDECAR_IMAGE}:${web_id}" > /dev/null || return 1

	echo "Waiting for ${name} to be ready."

	_wait_for "_is_sidecar_ready ${port}" 900
}

function _wait_for {
	local condition=${1}
	local timeout=${2}

	local elapsed=0

	until ${condition}
	do
		if [[ "${elapsed}" -ge "${timeout}" ]]
		then
			echo "Timed out after ${timeout} seconds waiting for ${condition}." >&2

			return 1
		fi

		sleep 5

		elapsed=$((elapsed + 5))
	done
}

function _wait_for_batch_imports {
	local since=${1}

	local count
	local elapsed=0
	local idle=0
	local last_count=0

	echo "Waiting for the batch engine imports to finish."

	while [[ "${idle}" -lt 20 ]]
	do
		if [[ "${elapsed}" -ge 600 ]]
		then
			echo "Timed out waiting for the batch engine imports." >&2

			return 1
		fi

		sleep 5

		elapsed=$((elapsed + 5))

		count=$(docker logs --since "${since}" "${CONTAINER_NAME}" 2>&1 | grep --count "BatchEngineImportTaskExecutorImpl")

		if [[ "${count}" -gt 0 ]] && [[ "${count}" -eq "${last_count}" ]]
		then
			idle=$((idle + 5))
		else
			idle=0
		fi

		last_count=${count}
	done
}

main "${@}"