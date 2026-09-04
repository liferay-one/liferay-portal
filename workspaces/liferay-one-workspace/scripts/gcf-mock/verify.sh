#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# Calls the three LDP usage endpoints on liferay-one-etc-spring-boot with a
# client credentials token and prints the responses. Works against whichever
# backend deploy.sh used.
#
# On k3s the client extension is reached by pod IP, from inside the gcf-mock
# pod, because Service DNS and ClusterIP routing do not resolve there. On
# compose the client extension shares the portal's network namespace and
# publishes 58081, so it is reachable from the host directly.

K3S_CONTAINER="${LIFERAY_ONE_K3S_CONTAINER:-lec-one-test-k3s-k3s}"
PRODUCT_EXTERNAL_REFERENCE_CODE="${PRODUCT_EXTERNAL_REFERENCE_CODE:-PRDCT-DATA-PLATFORM}"
PROJECT_EXTERNAL_REFERENCE_CODE="${PROJECT_EXTERNAL_REFERENCE_CODE:-PRJCT-028}"
SPRING_BOOT_DEPLOYMENT="liferayoneetcspringboot"
SPRING_BOOT_SERVICE="liferay-one-etc-spring-boot"
WORKSPACE_DIR="${LIFERAY_ONE_WORKSPACE_DIR:-../..}"

function main {
	if docker inspect "${K3S_CONTAINER}" > /dev/null 2>&1
	then
		LIFERAY_URL="${LIFERAY_URL:-http://localhost}"

		_verify_k3s

		return
	fi

	if [ -f "${WORKSPACE_DIR}/docker-compose.yaml" ]
	then
		LIFERAY_URL="${LIFERAY_URL:-http://localhost:8080}"

		_verify_compose

		return
	fi

	echo "Neither the k3s container ${K3S_CONTAINER} nor ${WORKSPACE_DIR}/docker-compose.yaml was found, so there is nothing to verify." >&2

	exit 1
}

function _each_endpoint {
	local access_token="${1}"
	local base_url="${2}"

	local path

	for path in \
		"usage?productExternalReferenceCode=${PRODUCT_EXTERNAL_REFERENCE_CODE}" \
		"usage/event-summary?startDate=2026-06-01&endDate=2026-08-31" \
		"usage/event-history?startDate=2025-10-01&endDate=2026-09-30&granularity=month"
	do
		echo ""
		echo "--- ${path%%\?*} ---"

		curl \
			--header "Authorization: Bearer ${access_token}" \
			--max-time 30 \
			--silent \
			--url "${base_url}/projects/${PROJECT_EXTERNAL_REFERENCE_CODE}/${path}"

		echo ""
	done
}

function _get_access_token {
	local client_id

	client_id=$(_read_oauth_metadata client.id)

	local client_secret

	client_secret=$(_read_oauth_metadata client.secret)

	curl \
		--data "client_id=${client_id}" \
		--data "client_secret=${client_secret}" \
		--data 'grant_type=client_credentials' \
		--max-time 30 \
		--silent \
		--url "${LIFERAY_URL}/o/oauth2/token" | \
			sed --expression 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

function _get_running_pod_ip {
	# A pod that is terminating keeps the Running phase and a deleted pod keeps
	# its IP for a moment, so the first matching item is not necessarily usable.
	# Skip anything carrying a deletion timestamp and wait for an IP to appear.

	local attempt

	for attempt in $(seq 1 24)
	do
		local line

		while read -r line
		do
			if [ -z "${line%%|*}" ] && [ -n "${line##*|}" ]
			then
				echo "${line##*|}"

				return 0
			fi
		done < <(_kubectl get pod --output=jsonpath='{range .items[?(@.status.phase=="Running")]}{.metadata.deletionTimestamp}|{.status.podIP}{"\n"}{end}' --selector="app=${1}")

		sleep 5
	done

	return 1
}

function _get_running_pod_name {
	local line

	while read -r line
	do
		if [ -z "${line%%|*}" ]
		then
			echo "${line##*|}"

			return 0
		fi
	done < <(_kubectl get pod --output=jsonpath='{range .items[?(@.status.phase=="Running")]}{.metadata.deletionTimestamp}|{.metadata.name}{"\n"}{end}' --selector="app=${1}")

	return 1
}

function _kubectl {
	docker exec "${K3S_CONTAINER}" kubectl "${@}"
}

function _read_oauth_metadata {
	# The metadata directory differs between the two environments -- k3s mounts
	# it at /etc/liferay/lxc/ext-init-metadata while compose writes it under
	# /opt/liferay/routes -- but both expose the location in
	# LIFERAY_ROUTES_CLIENT_EXTENSION, so resolve it inside the container.

	local command='cat "${LIFERAY_ROUTES_CLIENT_EXTENSION}/liferay-one-etc-spring-boot-oahs.oauth2.headless.server.'"${1}"'"'

	if docker inspect "${K3S_CONTAINER}" > /dev/null 2>&1
	then
		local pod_name

		pod_name=$(_get_running_pod_name "${SPRING_BOOT_DEPLOYMENT}")

		_kubectl exec "${pod_name}" --container=main -- sh -c "${command}"

		return
	fi

	(cd "${WORKSPACE_DIR}" && docker compose exec --no-TTY "${SPRING_BOOT_SERVICE}" sh -c "${command}")
}

function _verify_compose {
	local access_token

	access_token=$(_get_access_token)

	if [ -z "${access_token}" ]
	then
		echo "Unable to get an access token from ${LIFERAY_URL}." >&2

		return 1
	fi

	_each_endpoint "${access_token}" "http://localhost:58081"
}

function _verify_k3s {
	local access_token

	access_token=$(_get_access_token)

	if [ -z "${access_token}" ]
	then
		echo "Unable to get an access token from ${LIFERAY_URL}." >&2

		return 1
	fi

	local mock_pod_name

	mock_pod_name=$(_get_running_pod_name gcf-mock)

	if [ -z "${mock_pod_name}" ]
	then
		echo "Unable to find a running gcf-mock pod. Run ./deploy.sh first." >&2

		return 1
	fi

	local spring_boot_pod_ip

	spring_boot_pod_ip=$(_get_running_pod_ip "${SPRING_BOOT_DEPLOYMENT}")

	if [ -z "${spring_boot_pod_ip}" ]
	then
		echo "Unable to resolve a running ${SPRING_BOOT_DEPLOYMENT} pod IP." >&2

		return 1
	fi

	# The requests are issued from inside the gcf-mock pod, because the client
	# extension is only reachable by pod IP in this harness. That image carries
	# wget rather than curl.

	local path

	for path in \
		"usage?productExternalReferenceCode=${PRODUCT_EXTERNAL_REFERENCE_CODE}" \
		"usage/event-summary?startDate=2026-06-01&endDate=2026-08-31" \
		"usage/event-history?startDate=2025-10-01&endDate=2026-09-30&granularity=month"
	do
		echo ""
		echo "--- ${path%%\?*} ---"

		_kubectl exec "${mock_pod_name}" -- wget -O- -T 30 -q --header="Authorization: Bearer ${access_token}" "http://${spring_boot_pod_ip}:58081/projects/${PROJECT_EXTERNAL_REFERENCE_CODE}/${path}"

		echo ""
	done
}

main "${@}"