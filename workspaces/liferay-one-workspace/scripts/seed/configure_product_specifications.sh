#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# The Liferay products are marketplace products, so the
# liferay-one-batch-products batch does not hold them, and the seed batch that
# gives them their specifications runs only on a local server. UAT and prod
# therefore lack the specifications below. Without project-environment-profile
# the profile of a product resolves to none, and the project page hides its
# Environment tab. The solution type selects the purchase path of the product,
# and AI Hub uses ai-hub, as UAT already does.
#
# Run this script against each environment on its own, after the
# liferay-one-batch-products deploy that defines the specifications, with the
# LIFERAY_URL and the admin credentials of that environment:
#
# LIFERAY_ADMIN_EMAIL=... LIFERAY_ADMIN_PASSWORD=... LIFERAY_URL=... \
# scripts/seed/configure_product_specifications.sh
#
# The script writes one specification at a time. It does not send the
# specifications of a product in a product PATCH, because that request deletes
# every specification that the request body does not include.
#
# Each entry below is "productERC|specificationKey|value". Keep sorted.

PRODUCT_SPECIFICATIONS=(
	"marketplace-product-32336518|project-environment-profile|workspace"
	"marketplace-product-32654011|project-environment-profile|dxp"
	"marketplace-product-32915366|project-environment-profile|ai-hub"
	"marketplace-product-32915366|solution-type|ai-hub"
	"marketplace-product-33597098|project-environment-profile|ac-token"
	"marketplace-product-34997892|project-environment-profile|ai-hub"
)

function main {

	# The run uses the admin credentials, as configure_tier_cards.sh does, so
	# the same command works against every environment.

	export LIFERAY_AUTH_MODE=basic

	local failed=0
	local product_specification

	for product_specification in "${PRODUCT_SPECIFICATIONS[@]}"
	do
		local product_external_reference_code
		local specification_key
		local value

		IFS="|" read -r \
			product_external_reference_code \
			specification_key \
			value \
			<<< "${product_specification}"

		if ! _configure_product_specification \
			"${product_external_reference_code}" \
			"${specification_key}" \
			"${value}"
		then
			failed=1
		fi
	done

	return ${failed}
}

function _configure_product_specification {
	local product_external_reference_code="${1}"
	local specification_key="${2}"
	local value="${3}"

	local state

	state=$(_fetch_product_specifications "${product_external_reference_code}" | _read_specification_state "${specification_key}" "${value}")

	if [[ -z ${state} ]]
	then
		echo "Unable to read the product ${product_external_reference_code}." >&2

		return 1
	fi

	local action="${state%% *}"
	local id="${state##* }"

	if [[ ${action} == "unchanged" ]]
	then
		echo "The product ${product_external_reference_code} already has ${specification_key} ${value}."

		return 0
	fi

	local body

	body=$(python3 -c "
import json
import sys

print(json.dumps({'specificationKey': sys.argv[1], 'value': {'en_US': sys.argv[2]}}))
" "${specification_key}" "${value}")

	local response

	if [[ ${action} == "add" ]]
	then

		# The product ID here is the cProductId, which is the ID that this
		# endpoint takes.

		response=$(_curl \
			--data "${body}" \
			--header "Content-Type: application/json" \
			--request POST \
			"${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/products/${id}/productSpecifications" || true)
	else
		response=$(_curl \
			--data "${body}" \
			--header "Content-Type: application/json" \
			--request PATCH \
			"${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/productSpecifications/${id}" || true)
	fi

	if [[ $(_read_specification_value <<< "${response}") == "${value}" ]]
	then
		echo "Set ${specification_key} ${value} on the product ${product_external_reference_code}."

		return 0
	fi

	echo "Unable to set ${specification_key} on the product ${product_external_reference_code}, received ${response}." >&2

	return 1
}

# The nested specifications read their page size from
# productSpecifications.pageSize, not from pageSize. With the default page
# size, a product with more specifications than one page hides the one that the
# entry looks for, and the script adds a duplicate.

function _fetch_product_specifications {
	local product_external_reference_code="${1}"

	_curl "${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/${product_external_reference_code}?nestedFields=productSpecifications&productSpecifications.pageSize=200" || echo "{}"
}

# Prints "unchanged <specificationId>" when the product already has the value,
# "update <specificationId>" when it has the specification with another value,
# and "add <productId>" when it does not have the specification.

function _read_specification_state {
	local specification_key="${1}"
	local value="${2}"

	python3 -c "
import json
import sys

try:
	product = json.load(sys.stdin)
except Exception:
	sys.exit()

if not product.get('productId'):
	sys.exit()

product_specifications = [
	product_specification
	for product_specification in product.get('productSpecifications') or []
	if product_specification.get('specificationKey') == sys.argv[1]
]

for product_specification in product_specifications:
	if (product_specification.get('value') or {}).get('en_US') == sys.argv[2]:
		print('unchanged', product_specification['id'])

		sys.exit()

if product_specifications:
	print('update', product_specifications[0]['id'])
else:
	print('add', product['productId'])
" "${specification_key}" "${value}"
}

function _read_specification_value {
	python3 -c "
import json
import sys

try:
	print((json.load(sys.stdin).get('value') or {}).get('en_US', ''))
except Exception:
	print('')
"
}

main "${@}"