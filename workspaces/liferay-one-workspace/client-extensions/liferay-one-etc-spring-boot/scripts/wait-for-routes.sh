#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail

while [ ! -f "${LIFERAY_ROUTES_DXP}/com.liferay.lxc.dxp.mainDomain" ]
do
	echo "Waiting for route metadata in ${LIFERAY_ROUTES_DXP}"

	sleep 2
done

echo "Route metadata is present"