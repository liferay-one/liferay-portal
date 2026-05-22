#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source _common.sh

# The site initializer (BundleSiteInitializer._addUserAccounts) always patches
# every imported user to INACTIVE, ignoring the "status" field in
# user-accounts.json. There is no portal-core hook to override this in a SaaS
# workspace, so the seeded persona users are reactivated here as the final
# bootstrap step, after Liferay is healthy and the client extensions (including
# the site initializer) have been deployed.

LIFERAY_URL="${LIFERAY_URL:-http://localhost:8080}"

LIFERAY_ADMIN_EMAIL="${LIFERAY_ADMIN_EMAIL:-test@liferay.com}"
LIFERAY_ADMIN_PASSWORD="${LIFERAY_ADMIN_PASSWORD:-test}"

USER_ACCOUNTS_JSON="../client-extensions/liferay-one-site-initializer/site-initializer/user-accounts.json"

function main {
	local external_reference_codes

	external_reference_codes=$(_get_user_external_reference_codes)

	if [[ -z ${external_reference_codes} ]]
	then
		echo "No user accounts to activate." >&2

		return 0
	fi

	local external_reference_code

	for external_reference_code in ${external_reference_codes}
	do
		_activate_user_account "${external_reference_code}"
	done
}

function _activate_user_account {
	local external_reference_code="${1}"

	local url="${LIFERAY_URL}/o/headless-admin-user/v1.0/user-accounts/by-external-reference-code/${external_reference_code}"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		local status

		status=$(curl --silent --user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" "${url}" | _read_status || true)

		if [[ -z ${status} ]]
		then
			sleep 5

			continue
		fi

		if [[ ${status} == "Active" ]]
		then
			echo "Activated user ${external_reference_code}."

			return 0
		fi

		curl \
			--data '{"status": "Active"}' \
			--header "Content-Type: application/json" \
			--request PATCH \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			"${url}" \
			--output /dev/null || true

		sleep 3
	done

	echo "Unable to activate user ${external_reference_code}." >&2

	return 1
}

function _get_user_external_reference_codes {
	python3 -c "
import json

with open('${USER_ACCOUNTS_JSON}') as file:
	for user_account in json.load(file):
		external_reference_code = user_account.get('externalReferenceCode')

		if external_reference_code:
			print(external_reference_code)
"
}

function _read_status {
	python3 -c "
import json
import sys

try:
	print(json.load(sys.stdin).get('status', ''))
except Exception:
	print('')
"
}

main "${@}"