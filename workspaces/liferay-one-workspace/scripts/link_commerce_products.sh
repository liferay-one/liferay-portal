#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source _common.sh

# The site initializer imports object entries (addOrUpdateObjectEntries) before
# it creates the commerce products (addCPDefinitions), so an object entry cannot
# reference its CProduct through a commerce product relationship at import time
# -- the product does not exist yet, the import throws NoSuchCProductException,
# and the entire site initialization is rolled back. Those relationships are
# therefore established here, as a bootstrap step that runs after Liferay is
# healthy and the client extensions (including the site initializer) have been
# deployed, once both the object entries and the commerce products exist.
#
# Each entry below is "restContextPath relationshipField entryERC productERC".
# Keep sorted.

COMMERCE_PRODUCT_RELATIONSHIPS=(
	"/o/c/entitlementdefinitions r_commerceProductToEntitlementDefinition_CProductERC C_ENT_DEF_AIHUB PRDCT-AI-HUB"
	"/o/c/entitlementdefinitions r_commerceProductToEntitlementDefinition_CProductERC C_ENT_DEF_CONTENT_MARKETING PRDCT-CONTENT-MARKETING"
	"/o/c/entitlementdefinitions r_commerceProductToEntitlementDefinition_CProductERC C_ENT_DEF_DATA_PLATFORM PRDCT-DATA-PLATFORM"
	"/o/c/entitlementdefinitions r_commerceProductToEntitlementDefinition_CProductERC C_ENT_DEF_DSR PRDCT-DSR"
	"/o/c/entitlementdefinitions r_commerceProductToEntitlementDefinition_CProductERC C_ENT_DEF_DXP PRDCT-DXP"
	"/o/c/licensekeys r_commerceProductToLicenseKey_CProductERC C_LICENSE_KEY_BASIC_TIER PRDCT-DXP"
	"/o/c/licensekeys r_commerceProductToLicenseKey_CProductERC C_LICENSE_KEY_EP_PRODUCTION PRDCT-DXP"
	"/o/c/licensekeys r_commerceProductToLicenseKey_CProductERC C_LICENSE_KEY_FOUNDATION PRDCT-DXP"
	"/o/c/licensekeys r_commerceProductToLicenseKey_CProductERC C_LICENSE_KEY_MAIN_INSTANCE PRDCT-DXP"
	"/o/c/licensekeys r_commerceProductToLicenseKey_CProductERC C_LICENSE_KEY_PRIMARY PRDCT-DXP"
)

LIFERAY_URL="${LIFERAY_URL:-http://localhost:8080}"

LIFERAY_ADMIN_EMAIL="${LIFERAY_ADMIN_EMAIL:-test@liferay.com}"
LIFERAY_ADMIN_PASSWORD="${LIFERAY_ADMIN_PASSWORD:-test}"

function main {
	local relationship

	for relationship in "${COMMERCE_PRODUCT_RELATIONSHIPS[@]}"
	do
		_link_commerce_product ${relationship}
	done
}

function _link_commerce_product {
	local rest_context_path="${1}"
	local relationship_field="${2}"
	local external_reference_code="${3}"
	local product_external_reference_code="${4}"

	local url="${LIFERAY_URL}${rest_context_path}/by-external-reference-code/${external_reference_code}"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		# Wait for the object entry to be imported by the site initializer.

		local entry_external_reference_code

		entry_external_reference_code=$(curl --silent --user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" "${url}" | _read_field "externalReferenceCode" || true)

		if [[ -z ${entry_external_reference_code} ]]
		then
			sleep 5

			continue
		fi

		# Set the relationship. This fails until the commerce product exists, so
		# retry until the PATCH succeeds.

		local status

		status=$(curl \
			--data "{\"${relationship_field}\": \"${product_external_reference_code}\"}" \
			--header "Content-Type: application/json" \
			--output /dev/null \
			--request PATCH \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			--write-out "%{http_code}" \
			"${url}" || true)

		if [[ ${status} == 2* ]]
		then
			echo "Linked ${external_reference_code} to product ${product_external_reference_code}."

			return 0
		fi

		sleep 3
	done

	echo "Unable to link ${external_reference_code} to product ${product_external_reference_code}." >&2

	return 1
}

function _read_field {
	local field="${1}"

	python3 -c "
import json
import sys

try:
	print(json.load(sys.stdin).get('${field}', ''))
except Exception:
	print('')
"
}

main "${@}"