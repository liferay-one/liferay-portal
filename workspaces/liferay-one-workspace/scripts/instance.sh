#!/usr/bin/env bash

#
# Runs one database partitioned virtual instance per worktree on the shared
# local Liferay server. Each instance answers on http://<web ID>.one.localhost.
#
# Client extensions are built with -Pliferay.virtual.instance.id=<web ID>, so
# the workspace plugin suffixes the zip, the bundle symbolic name, and the web
# context path with _<web ID> and scopes every configuration to that instance.
#

function main {
	cd "$(dirname "${BASH_SOURCE[0]}")/.." || return 1

	local command=${1:-list}

	shift

	case "${command}" in
		copy)
			_copy "${@}"
			;;
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
		--url "http://localhost:8080/o/headless-portal-instances/v1.0/portal-instances${path}"
		--user "test@liferay.com:test"
		--write-out "\nHTTP %{http_code}\n"
	)

	if [ -n "${data}" ]
	then
		arguments+=(--data "${data}")
	fi

	curl "${arguments[@]}"
}

function _copy {
	local source_web_id=${1:?Set the source web ID.}
	local target_web_id=${2:?Set the target web ID.}

	_call_api POST /copy "$( \
		jq \
			--arg source "${source_web_id}" \
			--arg target "${target_web_id}" \
			--arg virtual_host "$(_get_virtual_host "${target_web_id}")" \
			--null-input \
			'{name: $target, sourcePortalInstanceId: $source, virtualHost: $virtual_host, webId: $target}')"
}

function _create {
	local web_id=${1:?Set the web ID.}

	_call_api POST "" "$( \
		jq \
			--arg virtual_host "$(_get_virtual_host "${web_id}")" \
			--arg web_id "${web_id}" \
			--null-input \
			'{admin: {emailAddress: "test@liferay.com", familyName: "Test", givenName: "Test"}, domain: "liferay.com", portalInstanceId: $web_id, virtualHost: $virtual_host}')"
}

function _delete {
	_call_api DELETE "/${1:?Set the web ID.}"
}

function _deploy {
	local web_id=${1:?Set the web ID.}

	shift

	local client_extensions=("${@}")

	if [ "${#client_extensions[@]}" -eq 0 ]
	then
		client_extensions=(
			liferay-one-global-css
			liferay-one-instance-settings
			liferay-one-custom-element
			liferay-one-batch
			liferay-one-site-initializer
		)
	fi

	local container_id

	container_id=$(docker ps --filter "name=^liferay$" --quiet)

	local client_extension

	for client_extension in "${client_extensions[@]}"
	do
		echo "Deploying ${client_extension} to ${web_id}."

		./gradlew \
			":client-extensions:${client_extension}:deploy" \
			-Ddeploy.docker.container.id="${container_id}" \
			-Pliferay.virtual.instance.id="${web_id}" \
			--quiet
	done
}

function _get_virtual_host {
	echo "${1}.one.localhost"
}

function _list {
	curl \
		--silent \
		--url "http://localhost:8080/o/headless-portal-instances/v1.0/portal-instances" \
		--user "test@liferay.com:test" | \
		jq --raw-output '.items[] | [.companyId, .portalInstanceId, .virtualHost, .active] | @tsv'
}

function _print_help {
	echo "Usage: scripts/instance.sh <command> [arguments]"
	echo ""
	echo "  copy <source web ID> <target web ID>"
	echo "  create <web ID>"
	echo "  delete <web ID>"
	echo "  deploy <web ID> [client extension ...]"
	echo "  list"
}

main "${@}"