#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

#
# Cleans and builds five liferay-one client extensions and deploys them to UAT
# in one Liferay Cloud build.
#
# lcp deploy --deploy-dir reads one folder for each service, and each folder
# must hold an LCP.json. A client extension zip holds its LCP.json and its
# Dockerfile at the root, so the script extracts each zip into its own folder
# under build/lcp-deploy. A folder of zips gives "No services found".
#
# lcp deploy sends the branch and the last commit of the first folder above the
# deploy directory that holds a .git entry, so the deploy directory is an
# absolute path inside this checkout. A --message replaces only the commit
# message, so the script does not set one.
#
# The Salesforce product batch, liferay-one-batch-products, does not deploy.
# Its product import fails for each product that already has its options, and
# that fails the batch job on Liferay Cloud. See scripts/deploy.sh.
#
# Usage: scripts/deploy_uat.sh [<client-extension>...]
#
# With no arguments, all five client extensions deploy.
#
# Environment:
# DRY_RUN (optional) Set to true to build and extract, and print the lcp
# command without running it
# LCP_PROJECT (optional) Default exte5a2oneliferay-extuat
#

CXS=(
	liferay-one-batch
	liferay-one-custom-element
	liferay-one-etc-spring-boot
	liferay-one-global-css
	liferay-one-instance-settings
)
LCP_PROJECT="${LCP_PROJECT:-exte5a2oneliferay-extuat}"

function main {
	cd "$(dirname "${BASH_SOURCE[0]}")/.."

	if [[ "${#}" -gt 0 ]]
	then
		CXS=("${@}")
	fi

	echo "Deploying ${CXS[*]} to ${LCP_PROJECT} in one build."

	./gradlew clean
	./gradlew $(printf ":client-extensions:%s:build " "${CXS[@]}")

	rm --force --recursive build/lcp-deploy

	mkdir --parents build/lcp-deploy

	local cx

	for cx in "${CXS[@]}"
	do
		unzip \
			-d "build/lcp-deploy/${cx}" \
			-q \
			"client-extensions/${cx}/dist/${cx}.zip"

		if [ ! -f "build/lcp-deploy/${cx}/LCP.json" ]
		then
			echo "${cx}.zip has no LCP.json." >&2

			return 1
		fi
	done

	ls --all -l build/lcp-deploy

	local lcp_command=(
		lcp deploy
		--deploy-dir "$(pwd)/build/lcp-deploy"
		--project "${LCP_PROJECT}"
	)

	if [ "${DRY_RUN:-false}" == "true" ]
	then
		echo "${lcp_command[*]}"
	else
		"${lcp_command[@]}"
	fi
}

main "${@}"