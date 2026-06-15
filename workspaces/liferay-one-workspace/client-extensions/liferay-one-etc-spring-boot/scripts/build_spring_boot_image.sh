#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

function main {
	local script_dir

	script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

	local client_extension_dir="${script_dir}/.."
	local workspace_dir="${client_extension_dir}/../.."

	cd "${workspace_dir}"

	echo "Building boot jar."
	./gradlew :client-extensions:liferay-one-etc-spring-boot:bootJar

	local libs_dir="${client_extension_dir}/build/libs"
	local staging_dir="${client_extension_dir}/build/docker"

	echo "Staging Docker build context in ${staging_dir}."
	rm -rf "${staging_dir}"
	mkdir -p "${staging_dir}"

	cp "${libs_dir}/liferay-one-etc-spring-boot.jar" "${staging_dir}"
	cp "${client_extension_dir}/Dockerfile" "${staging_dir}"

	echo "Building liferay-one-etc-spring-boot:local image."
	docker build --tag liferay-one-etc-spring-boot:local "${staging_dir}"

	echo "Generating local environment file from application-default.properties."
	local properties_file="${client_extension_dir}/src/main/resources/application-default.properties"
	local env_file="${client_extension_dir}/build/local.env"

	grep -oE '[$][{][A-Z0-9_]+[}]' "${properties_file}" | tr -d '${}' | sort -u | sed 's/$/=unused/' > "${env_file}"

	echo "Done. Built liferay-one-etc-spring-boot:local and wrote ${env_file}."
}

main "${@}"