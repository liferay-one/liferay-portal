#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# Test data records (accounts, users, projects, contracts, license keys,
# project memberships, and publisher records) are environment-specific seed
# data, so they are not shipped in the liferay-one-batch client extension,
# which deploys to every environment. They are instead imported here, as a
# bootstrap step that runs after Liferay is healthy and the client extensions
# (including the batch object definitions) have been deployed. Each
# batch-engine-data file under data is a batch engine document; the files are
# imported in filename order so dependencies resolve (accounts before projects,
# projects before memberships, and so on). Imports upsert by external reference
# code, so re-runs are idempotent.

BATCH_ENGINE_URL="${LIFERAY_URL}/o/headless-batch-engine/v1.0/import-task"

PRODUCT_BATCH_DIR="${WORKSPACE_ROOT}/client-extensions/liferay-one-batch-products/batch"

function main {
	_require_local_seed_target

	_acquire_oauth_token

	_wait_for_object_definitions

	local status=0

	_ensure_batch_records || status=1

	local file

	for file in data/*.batch-engine-data.json
	do
		_import "${file}"
	done

	return "${status}"
}

# The batch client extensions create three kinds of record only on an
# environment that does not have them yet, and fail on each later deploy: the
# SGD currency and the C_PROJECT_MEMBERSHIP validation rule have no upsert on
# 2026.q1.2, and a product import fails for each product that already has its
# options. When a first import did not create one of them, no later deploy does,
# so create each one that is missing. The rule must exist before the project
# memberships, because Liferay refuses a composite key rule on an object that
# has entries.

function _ensure_batch_records {
	local status=0

	_ensure_currency || status=1
	_ensure_object_validation_rule || status=1
	_ensure_salesforce_products || status=1

	return "${status}"
}

function _ensure_currency {
	local http_code

	http_code=$(_curl \
		--output /dev/null \
		--write-out "%{http_code}" \
		"${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/currencies/by-externalReferenceCode/SGD")

	[[ ${http_code} == "200" ]] && return 0

	_import "${BATCH_DIR}/07-commerce-currency.batch-engine-data.json"
}

function _ensure_object_validation_rule {
	local file="${BATCH_DIR}/05-object-validation-rule.batch-engine-data.json"

	local object_definition_external_reference_code
	object_definition_external_reference_code=$(_read_config "${file}" "externalReferenceCode")

	local url="${LIFERAY_URL}/o/object-admin/v1.0/object-definitions/by-external-reference-code/${object_definition_external_reference_code}/object-validation-rules"

	local missing_items

	if ! missing_items=$(_curl --fail "${url}?pageSize=-1" | python3 -c "
import json
import sys

external_reference_codes = {
	item['externalReferenceCode'] for item in json.load(sys.stdin)['items']
}

with open('${file}') as file:
	items = json.load(file)['items']

json.dump(
	[
		item
		for item in items
		if item['externalReferenceCode'] not in external_reference_codes
	],
	sys.stdout)
")
	then
		echo "Unable to read the validation rules of ${object_definition_external_reference_code}." >&2

		return 1
	fi

	local item

	while read -r item
	do
		[[ -z ${item} ]] && continue

		local http_code

		http_code=$(_curl \
			--data "${item}" \
			--header "Content-Type: application/json" \
			--output /dev/null \
			--write-out "%{http_code}" \
			"${url}")

		if [[ ${http_code} != 2* ]]
		then
			echo "Unable to add the validation rule $(echo "${item}" | _read_field "externalReferenceCode") to ${object_definition_external_reference_code}." >&2

			return 1
		fi

		echo "Added the validation rule $(echo "${item}" | _read_field "externalReferenceCode") to ${object_definition_external_reference_code}."
	done < <(echo "${missing_items}" | python3 -c "
import json
import sys

for item in json.load(sys.stdin):
	print(json.dumps(item))
")
}

function _ensure_salesforce_products {
	local file="${PRODUCT_BATCH_DIR}/05-commerce-product.batch-engine-data.json"

	local missing_file
	missing_file=$(mktemp --suffix=.batch-engine-data.json)

	local count

	if ! count=$(_curl --fail "${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/products?fields=externalReferenceCode&pageSize=-1" | python3 -c "
import json
import sys

external_reference_codes = {
	item['externalReferenceCode'] for item in json.load(sys.stdin)['items']
}

with open('${file}') as file:
	batch = json.load(file)

batch['items'] = [
	item
	for item in batch['items']
	if item['externalReferenceCode'] not in external_reference_codes
]

with open('${missing_file}', 'w') as file:
	json.dump(batch, file)

print(len(batch['items']))
")
	then
		echo "Unable to read the products." >&2

		rm -f "${missing_file}"

		return 1
	fi

	local status=0

	if [[ ${count} != "0" ]]
	then
		echo "Importing ${count} missing Salesforce products."

		_import "${missing_file}" || status=1
	fi

	rm -f "${missing_file}"

	return "${status}"
}

function _import {
	local file="${1}"

	local class_name
	class_name=$(_read_config "${file}" "className")

	local create_strategy
	create_strategy=$(_read_config "${file}" "createStrategy")

	local import_strategy="ON_ERROR_CONTINUE"

	if [[ $(_read_config "${file}" "onErrorFail") == "true" ]]
	then
		import_strategy="ON_ERROR_FAIL"
	fi

	local url

	if [[ ${class_name} == "com.liferay.object.model.ObjectDefinition#"* ]]
	then

		# The generic batch engine import task does not recognize dynamic custom
		# object classes, so custom object entries are imported through the
		# object's own scoped batch endpoint, resolved from the object
		# definition's REST context path.

		local object_external_reference_code="${class_name#*#}"

		local rest_context_path

		rest_context_path=$(_curl \
			"${LIFERAY_URL}/o/object-admin/v1.0/object-definitions/by-external-reference-code/${object_external_reference_code}" \
			| _read_field "restContextPath")

		if [[ -z ${rest_context_path} ]]
		then
			echo "Unable to resolve REST context path for ${object_external_reference_code}." >&2

			return 1
		fi

		url="${LIFERAY_URL}${rest_context_path}/batch?createStrategy=${create_strategy}&importStrategy=${import_strategy}"
	else
		local task_item_delegate_name
		task_item_delegate_name=$(_read_config "${file}" "taskItemDelegateName")

		local encoded_class_name
		encoded_class_name=$(python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=''))" "${class_name}")

		url="${BATCH_ENGINE_URL}/${encoded_class_name}?createStrategy=${create_strategy}&importStrategy=${import_strategy}&taskItemDelegateName=${task_item_delegate_name}"
	fi

	_lock_batch_import

	local import_task_id

	import_task_id=$(_read_items "${file}" | _curl \
		--data @- \
		--header "Content-Type: application/json" \
		"${url}" \
		| _read_field "id")

	if [[ -z ${import_task_id} ]]
	then
		_unlock_batch_import

		echo "Unable to start import for ${file}." >&2

		return 1
	fi

	local status=0

	_wait_for_import "${import_task_id}" "${file}" || status=${?}

	_unlock_batch_import

	return "${status}"
}

function _wait_for_import {
	local import_task_id="${1}"
	local file="${2}"

	local attempt

	# A remote environment's batch engine can take several minutes to drain a
	# queued import, far longer than a fresh local bundle, so wait generously
	# (1200 attempts x 0.5s = 10 minutes). A completed or failed task breaks early,
	# and the fine poll granularity keeps a fast local import from idling up to two
	# seconds past completion on each of these files.

	for ((attempt = 1; attempt <= 1200; attempt++))
	do
		local execute_status

		execute_status=$(_curl \
			"${BATCH_ENGINE_URL}/${import_task_id}" \
			| _read_field "executeStatus")

		case "${execute_status}" in
			COMPLETED)
				echo "Imported ${file}."

				return 0
				;;
			FAILED)
				echo "Unable to import ${file}." >&2

				_curl \
					"${BATCH_ENGINE_URL}/${import_task_id}/failed-items/report" >&2

				return 1
				;;
		esac

		sleep 0.5
	done

	echo "Timed out waiting for import of ${file}." >&2

	return 1
}

function _wait_for_object_definitions {
	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		local status

		status=$(_curl \
			--output /dev/null \
			--write-out "%{http_code}" \
			"${LIFERAY_URL}/o/c/projects")

		if [[ ${status} == "200" ]]
		then
			return 0
		fi

		sleep 5
	done

	echo "Object definitions were not available." >&2

	return 1
}

function _read_config {
	local file="${1}"
	local key="${2}"

	python3 -c "
import json

with open('${file}') as file:
	configuration = json.load(file)['configuration']

print(configuration.get('${key}') or configuration.get('parameters', {}).get('${key}', ''))
"
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

function _read_items {
	local file="${1}"

	python3 -c "
import json
import sys

with open('${file}') as file:
	json.dump(json.load(file)['items'], sys.stdout)
"
}

main "${@}"