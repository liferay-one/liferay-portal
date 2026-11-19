#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source _common.sh

# LPD-115566 moved the licensing settings "allowComplimentary",
# "allowPermanentLicenses", and "allowSelfProvisioning" from account custom
# fields to fields of the same names on each project. Run this script in each
# environment as soon as the batch client extension that adds the project
# fields is deployed. It copies the complimentary and the self provisioning
# settings of each account to every project of that account. An account
# without a value keeps the meaning it had before: no complimentary key, and
# self provisioning allowed. A project that already has an active
# complimentary key does not allow another one, whatever its account says.
# Permanent licenses are not copied. Every project starts without them, and a
# Provisioning Administrator or a Provisioning Worker turns them on.
#
# The script writes each setting explicitly, also where the project has no
# value, and only to a project whose three settings all read false. That is a
# project that no copy and no Spring Boot upsert has written. A second run
# therefore retries the projects that failed. A project on which an
# administrator turned off all three settings also reads as not written, so
# run DRY_RUN=true before a second run and check the list. Set FORCE=true to
# copy to every project. Set DRY_RUN=true to print the changes without writing
# them. The script exits with an error when a project update fails.

function main {
	_acquire_oauth_token

	_TEMP_DIR=$(mktemp -d)

	_add_exit_command "_delete_temp_dir"

	_get_items \
		"${LIFERAY_URL}/o/headless-admin-user/v1.0/accounts?fields=customFields,id" \
		> "${_TEMP_DIR}/accounts.json"

	_get_items \
		"${LIFERAY_URL}/o/c/activationkeys?fields=r_projectToActivationKey_c_projectERC&filter=active%20eq%20true%20and%20type%20eq%20%27complimentary%27" \
		> "${_TEMP_DIR}/complimentary_activation_keys.json"

	_get_items \
		"${LIFERAY_URL}/o/c/projects?fields=allowComplimentary,allowPermanentLicenses,allowSelfProvisioning,externalReferenceCode,r_accountEntryToProject_accountEntryId" \
		> "${_TEMP_DIR}/projects.json"

	if ! _get_changes \
			"${_TEMP_DIR}/accounts.json" \
			"${_TEMP_DIR}/complimentary_activation_keys.json" \
			"${_TEMP_DIR}/projects.json" \
			"${FORCE:-false}" \
			> "${_TEMP_DIR}/changes.txt"
	then
		_warn "Unable to compare the account settings with the project settings."

		exit 1
	fi

	local changed_count=0
	local failed_count=0

	local body
	local external_reference_code

	while read -r external_reference_code body
	do
		if [[ ${DRY_RUN:-false} == "true" ]]
		then
			echo "Would set ${body} on project ${external_reference_code}."
		elif ! _update_project "${body}" "${external_reference_code}"
		then
			failed_count=$((failed_count + 1))

			continue
		fi

		changed_count=$((changed_count + 1))
	done < "${_TEMP_DIR}/changes.txt"

	if [[ ${DRY_RUN:-false} == "true" ]]
	then
		echo "Would copy the account settings to ${changed_count} project(s)."

		return
	fi

	echo "Copied the account settings to ${changed_count} project(s)."

	if ((failed_count > 0))
	then
		_warn "Unable to update ${failed_count} project(s). Run the script again to retry them."

		exit 1
	fi
}

function _delete_temp_dir {
	rm -fr "${_TEMP_DIR}"
}

function _get_changes {
	python3 -c "
import json
import sys
import urllib.parse

ACCOUNT_SETTING_NAMES = ('allowComplimentary', 'allowSelfProvisioning')

DEFAULT_VALUES = {
	'allowComplimentary': False,
	'allowPermanentLicenses': False,
	'allowSelfProvisioning': True,
}

account_values = {}

with open(sys.argv[1]) as file:
	for line in file:
		account = json.loads(line)

		values = dict(DEFAULT_VALUES)

		for custom_field in account.get('customFields') or []:
			name = custom_field.get('name')

			if name not in ACCOUNT_SETTING_NAMES:
				continue

			data = (custom_field.get('customValue') or {}).get('data')

			if data in (None, ''):
				continue

			values[name] = data in (True, 'true')

		account_values[account['id']] = values

complimentary_project_external_reference_codes = set()

with open(sys.argv[2]) as file:
	for line in file:
		complimentary_project_external_reference_codes.add(
			json.loads(line).get('r_projectToActivationKey_c_projectERC'))

with open(sys.argv[3]) as file:
	for line in file:
		project = json.loads(line)

		if sys.argv[4] != 'true' and any(
				project.get(name) for name in DEFAULT_VALUES):

			continue

		values = dict(
			account_values.get(
				project.get('r_accountEntryToProject_accountEntryId'),
				DEFAULT_VALUES))

		if (project['externalReferenceCode'] in
				complimentary_project_external_reference_codes):

			values['allowComplimentary'] = False

		changed_values = {
			name: value
			for name, value in sorted(values.items())
			if project.get(name) != value
		}

		if not changed_values:
			continue

		print(
			urllib.parse.quote(project['externalReferenceCode'], safe=''),
			json.dumps(changed_values, separators=(',', ':')))
" "${1}" "${2}" "${3}" "${4}"
}

function _get_items {
	local url="${1}"

	local last_page=1
	local page=1

	while ((page <= last_page))
	do
		local response

		response=$(_curl --fail "${url}&page=${page}&pageSize=200")

		echo "${response}" | python3 -c "
import json
import sys

for item in json.load(sys.stdin).get('items', []):
	print(json.dumps(item))
"

		last_page=$(echo "${response}" | _json_field "lastPage")

		page=$((page + 1))
	done
}

function _update_project {
	local body="${1}"
	local external_reference_code="${2}"

	if _curl \
		--data "${body}" \
		--fail \
		--header "Content-Type: application/json" \
		--output /dev/null \
		--request PATCH \
		"${LIFERAY_URL}/o/c/projects/by-external-reference-code/${external_reference_code}"
	then
		echo "Set ${body} on project ${external_reference_code}."
	else
		_warn "Unable to update project ${external_reference_code}."

		return 1
	fi
}

main "${@}"