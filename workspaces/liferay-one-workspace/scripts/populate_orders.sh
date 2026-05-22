#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source _common.sh

# CommerceOrder and CommerceOrderItem are system commerce objects, so they
# cannot be imported as site initializer object entries -- they have to be
# placed through the commerce order headless API. Because an Entitlement is the
# child of a CommerceOrderItem (see the commerceOrderItemToEntitlement object
# relationship), the order item has to exist before the entitlement can
# reference it. The entitlements are therefore created here rather than in the
# site initializer, which keeps the full Account -> Project -> Contract ->
# Order -> Order Item -> Entitlement chain intact.
#
# Each file under orders/ describes one order: the order with its nested order
# items, the entitlements granted by those order items, and the license keys
# those entitlements unlock. This runs as a bootstrap step after Liferay is
# healthy and the client extensions (including the site initializer) have been
# deployed, once the accounts, projects, contracts, products, and entitlement
# definitions the orders reference exist.

LIFERAY_URL="${LIFERAY_URL:-http://localhost:8080}"

LIFERAY_ADMIN_EMAIL="${LIFERAY_ADMIN_EMAIL:-test@liferay.com}"
LIFERAY_ADMIN_PASSWORD="${LIFERAY_ADMIN_PASSWORD:-test}"

CHANNEL_EXTERNAL_REFERENCE_CODE="LIFERAY_ONE_CHANNEL"

ORDERS_DIR="orders"

function main {
	local channel_id

	channel_id=$(_resolve_channel_id) || return 1

	local file

	for file in "${ORDERS_DIR}"/*.json
	do
		_populate_order "${file}" "${channel_id}"
	done
}

function _build_order_payload {
	local file="${1}"
	local channel_id="${2}"
	local contract_id="${3}"

	python3 -c "
import json

with open('${file}') as file:
	order = json.load(file)['order']

# channelExternalReferenceCode is not resolved on create, so the numeric
# channelId is required. The contract is linked through the
# contractToCommerceOrder object relationship, whose foreign key field on the
# order takes the numeric contract object entry ID. The order item name is
# denormalized from the SKU on create -- sending it rejects the nested mapping
# -- so it is kept in the file for readability and dropped here.

order.pop('channelExternalReferenceCode', None)
order.pop('contractExternalReferenceCode', None)

order['channelId'] = ${channel_id}
order['r_contractToCommerceOrder_c_contractId'] = ${contract_id}

for order_item in order.get('orderItems', []):
	order_item.pop('name', None)

print(json.dumps(order))
"
}

function _link_license_keys {
	local file="${1}"

	local license_key

	while IFS= read -r license_key
	do
		[[ -z ${license_key} ]] && continue

		local external_reference_code

		external_reference_code=$(echo "${license_key}" | _read_field "externalReferenceCode")

		local status

		status=$(curl \
			--data "${license_key}" \
			--header "Content-Type: application/json" \
			--output /dev/null \
			--request PATCH \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			--write-out "%{http_code}" \
			"${LIFERAY_URL}/o/c/licensekeys/by-external-reference-code/${external_reference_code}" || true)

		if [[ ${status} == 2* ]]
		then
			echo "Linked license key ${external_reference_code} to its entitlement."
		else
			echo "Unable to link license key ${external_reference_code} to its entitlement." >&2
		fi
	done < <(_read_array "${file}" "licenseKeys")
}

# The My Projects UI reads order fields that the order placement payload does
# not accept: the projectName and cloudProjectName custom fields (used to scope
# the project's Orders and Environment tabs) and the standard purchaseOrderNumber
# (shown as the purchase number on the product details). They are applied with a
# follow-up PATCH from the customFields object and purchaseOrderNumber in the
# order file once the order exists.

function _set_order_fields {
	local file="${1}"
	local order_id="${2}"

	local payload

	payload=$(python3 -c "
import json
import sys

with open(sys.argv[1]) as file:
	data = json.load(file)

patch = {}

if data.get('customFields'):
	patch['customFields'] = data['customFields']

if data.get('purchaseOrderNumber'):
	patch['purchaseOrderNumber'] = data['purchaseOrderNumber']

print(json.dumps(patch))
" "${file}")

	[[ ${payload} == "{}" ]] && return 0

	local status

	status=$(curl \
		--data "${payload}" \
		--header "Content-Type: application/json" \
		--output /dev/null \
		--request PATCH \
		--silent \
		--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
		--write-out "%{http_code}" \
		"${LIFERAY_URL}/o/headless-commerce-admin-order/v1.0/orders/${order_id}" || true)

	if [[ ${status} == 2* ]]
	then
		echo "Set fields for order ${order_id}."
	else
		echo "Unable to set fields for order ${order_id}." >&2
	fi
}

function _populate_order {
	local file="${1}"
	local channel_id="${2}"

	local order_external_reference_code

	order_external_reference_code=$(_read_field "order.externalReferenceCode" < "${file}")

	local contract_external_reference_code

	contract_external_reference_code=$(_read_field "order.contractExternalReferenceCode" < "${file}")

	local contract_id

	contract_id=$(_resolve_contract_id "${contract_external_reference_code}") || return 1

	local payload

	payload=$(_build_order_payload "${file}" "${channel_id}" "${contract_id}")

	# The order placement upserts by external reference code, so re-running is
	# idempotent. Retry while the products and SKUs the order items reference
	# are still being imported by the site initializer.

	local attempt
	local response
	local status

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		response=$(curl \
			--data "${payload}" \
			--header "Content-Type: application/json" \
			--request POST \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			--write-out "\n%{http_code}" \
			"${LIFERAY_URL}/o/headless-commerce-admin-order/v1.0/orders" || true)

		status=$(echo "${response}" | tail -n 1)

		if [[ ${status} == 2* ]]
		then
			break
		fi

		sleep 3
	done

	if [[ ${status} != 2* ]]
	then
		echo "Unable to create order ${order_external_reference_code}." >&2

		return 1
	fi

	echo "Created order ${order_external_reference_code}."

	local order_id

	order_id=$(echo "${response}" | sed '$d' | _read_field "id")

	_set_order_fields "${file}" "${order_id}"
	_upsert_entitlements "${file}"
	_link_license_keys "${file}"
}

function _read_array {
	local file="${1}"
	local key="${2}"

	python3 -c "
import json

with open('${file}') as file:
	for item in json.load(file).get('${key}', []):
		print(json.dumps(item))
"
}

function _read_field {
	local field="${1}"

	python3 -c "
import json
import sys

try:
	value = json.load(sys.stdin)

	for key in '${field}'.split('.'):
		value = value[key]

	print(value)
except Exception:
	print('')
"
}

function _resolve_channel_id {
	local url="${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels?pageSize=100"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		local channel_id

		channel_id=$(curl --silent --user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" "${url}" | python3 -c "
import json
import sys

try:
	for channel in json.load(sys.stdin).get('items', []):
		if channel.get('externalReferenceCode') == '${CHANNEL_EXTERNAL_REFERENCE_CODE}':
			print(channel.get('id'))

			break
except Exception:
	pass
" || true)

		if [[ -n ${channel_id} ]]
		then
			echo "${channel_id}"

			return 0
		fi

		sleep 5
	done

	echo "Unable to resolve channel ${CHANNEL_EXTERNAL_REFERENCE_CODE}." >&2

	return 1
}

function _resolve_contract_id {
	local external_reference_code="${1}"

	local url="${LIFERAY_URL}/o/c/contracts/by-external-reference-code/${external_reference_code}"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		local contract_id

		contract_id=$(curl --silent --user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" "${url}" | _read_field "id" || true)

		if [[ -n ${contract_id} ]]
		then
			echo "${contract_id}"

			return 0
		fi

		sleep 5
	done

	echo "Unable to resolve contract ${external_reference_code}." >&2

	return 1
}

function _upsert_entitlements {
	local file="${1}"

	local entitlement

	while IFS= read -r entitlement
	do
		[[ -z ${entitlement} ]] && continue

		local external_reference_code

		external_reference_code=$(echo "${entitlement}" | _read_field "externalReferenceCode")

		local status

		status=$(curl \
			--data "${entitlement}" \
			--header "Content-Type: application/json" \
			--output /dev/null \
			--request PUT \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			--write-out "%{http_code}" \
			"${LIFERAY_URL}/o/c/entitlements/by-external-reference-code/${external_reference_code}" || true)

		if [[ ${status} == 2* ]]
		then
			echo "Created entitlement ${external_reference_code}."
		else
			echo "Unable to create entitlement ${external_reference_code}." >&2
		fi
	done < <(_read_array "${file}" "entitlements")
}

main "${@}"