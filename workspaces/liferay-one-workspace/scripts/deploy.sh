#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

#
# Builds the client extensions that changed since a base commit and deploys them
# to a Liferay Cloud environment with the lcp CLI. With no base commit, the
# script deploys every deployable client extension.
#
# A change to a shared build input deploys every client extension, because each
# one can build differently. A change outside client-extensions/ and the shared
# build inputs deploys nothing.
#
# A client extension is deployable when its LCP.json does not set a top level
# "deploy": false. The batch client extension deploys first and the site
# initializer second, because the site initializer references the objects that
# the batch client extension defines.
#
# Usage: scripts/deploy.sh [<base-commit>]
#
# Environment:
# LCP_PROJECT (required) The project and environment ID
# DRY_RUN (optional) Set to true to print the commands and not run them
#

function main {
	if [ -z "${LCP_PROJECT:-}" ]
	then
		echo "Set LCP_PROJECT, for example exte5a2oneliferay-extuat." >&2

		return 1
	fi

	cd "$(dirname "${BASH_SOURCE[0]}")/.."

	local base_commit="${1:-}"

	local client_extensions

	mapfile -t client_extensions < <(_get_changed_client_extensions "${base_commit}")

	if [[ "${#client_extensions[@]}" -eq 0 ]]
	then
		echo "No client extension changed since ${base_commit}."

		return 0
	fi

	echo "Deploying ${client_extensions[*]} to ${LCP_PROJECT}."

	local client_extension
	local gradle_tasks=()

	for client_extension in "${client_extensions[@]}"
	do
		gradle_tasks+=(":client-extensions:${client_extension}:build")
	done

	_run ./gradlew "${gradle_tasks[@]}"

	for client_extension in "${client_extensions[@]}"
	do
		_run lcp deploy \
			--extension "client-extensions/${client_extension}/dist/${client_extension}.zip" \
			--message "${client_extension} $(git rev-parse --short HEAD)" \
			--project "${LCP_PROJECT}"
	done
}

function _get_changed_client_extensions {
	local deployable_client_extensions

	mapfile -t deployable_client_extensions < <(_get_deployable_client_extensions)

	if [ -z "${1}" ]
	then
		printf "%s\n" "${deployable_client_extensions[@]}"

		return
	fi

	local changed_paths

	mapfile -t changed_paths < <( \
		git diff \
			--name-only \
			--relative \
			"${1}" \
			HEAD \
			-- \
			.)

	local changed_path
	local shared_build_input
	local shared_build_inputs=(
		.yarnrc
		build.gradle
		gradle
		gradle-local.properties
		gradle.properties
		gradlew
		package.json
		settings.gradle
		tools
		yarn.lock
	)

	for changed_path in "${changed_paths[@]}"
	do
		for shared_build_input in "${shared_build_inputs[@]}"
		do
			if [[ "${changed_path}" == "${shared_build_input}" ]] ||
			   [[ "${changed_path}" == "${shared_build_input}/"* ]]
			then
				printf "%s\n" "${deployable_client_extensions[@]}"

				return
			fi
		done
	done

	local client_extension

	for client_extension in "${deployable_client_extensions[@]}"
	do
		for changed_path in "${changed_paths[@]}"
		do
			if [[ "${changed_path}" == "client-extensions/${client_extension}/"* ]]
			then
				echo "${client_extension}"

				break
			fi
		done
	done
}

function _get_deployable_client_extensions {
	local client_extension_yaml
	local client_extensions=()

	for client_extension_yaml in client-extensions/*/client-extension.yaml
	do
		local client_extension_dir

		client_extension_dir=$(dirname "${client_extension_yaml}")

		if [ -f "${client_extension_dir}/LCP.json" ] &&
		   [ "$(jq ".deploy" "${client_extension_dir}/LCP.json")" == "false" ]
		then
			continue
		fi

		client_extensions+=("$(basename "${client_extension_dir}")")
	done

	local client_extension

	for client_extension in liferay-one-batch liferay-one-site-initializer
	do
		if [[ " ${client_extensions[*]} " == *" ${client_extension} "* ]]
		then
			echo "${client_extension}"
		fi
	done

	for client_extension in "${client_extensions[@]}"
	do
		if [ "${client_extension}" != "liferay-one-batch" ] &&
		   [ "${client_extension}" != "liferay-one-site-initializer" ]
		then
			echo "${client_extension}"
		fi
	done
}

function _run {
	if [ "${DRY_RUN:-false}" == "true" ]
	then
		echo "${*}"
	else
		"${@}"
	fi
}

main "${@}"