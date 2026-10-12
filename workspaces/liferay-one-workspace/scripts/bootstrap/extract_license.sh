#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

function main {
	local force=false

	if [[ ${1:-} == -f ]] ||
	   [[ ${1:-} == --force ]]
	then
		force=true
	fi

	local license_file=../../build/docker/deploy/license.xml

	if [[ -f ${license_file} ]] &&
	   [[ ${force} == false ]]
	then
		echo "A trial license already exists at ${license_file}."

		exit 0
	fi

	echo "Extracting the trial license from \"liferay/dxp:latest\"."

	local license_dir

	license_dir=$(dirname "${license_file}")

	mkdir -p "${license_dir}"

	if [[ ${force} == true ]]
	then
		echo "Pulling the latest \"liferay/dxp:latest\" image."

		docker pull liferay/dxp:latest
	fi

	#
	# Stream the license through stdout rather than a bind mount, so it lands
	# here even when DOCKER_HOST points at a daemon on another machine.
	#

	if ! docker run \
		--entrypoint sh \
		--rm \
		liferay/dxp:latest \
		-c \
		"cat /opt/liferay/osgi/modules/trial-dxp-license*.xml 2> /dev/null || cat /opt/liferay/deploy/trial-dxp-license*.xml" > "${license_file}" ||
	   [[ ! -s ${license_file} ]]
	then
		rm -f "${license_file}"

		echo "Unable to extract the trial license from \"liferay/dxp:latest\"." >&2

		return 1
	fi
}

main "${@}"