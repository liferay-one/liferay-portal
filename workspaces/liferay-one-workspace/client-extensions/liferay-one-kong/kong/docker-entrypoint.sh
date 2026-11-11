#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

#
# Liferay Cloud drops traffic from Kong to the internal address of the
# liferayoneetcspringboot service, so use its public URL.
#

function main {
	local spring_boot_url="http://liferayoneetcspringboot:58081"

	if [ -n "${LCP_PROJECT_ID:-}" ]
	then
		spring_boot_url="https://liferayoneetcspringboot-${LCP_PROJECT_ID}.lfr.cloud"
	fi

	sed --expression "s|__SPRING_BOOT_URL__|${spring_boot_url}|" /kong/kong.yml > /tmp/kong.yml

	exec /docker-entrypoint.sh "${@}"
}

main "${@}"