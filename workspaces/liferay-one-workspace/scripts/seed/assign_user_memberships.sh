#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

ROLE_URL="${LIFERAY_URL}/o/headless-admin-user/v1.0/roles"

USER_ACCOUNT_URL="${LIFERAY_URL}/o/headless-admin-user/v1.0/user-accounts"

USER_GROUP_URL="${LIFERAY_URL}/o/headless-admin-user/v1.0/user-groups"

GROUP_MEMBERSHIPS=(
	"C_EMPLOYEES=USER_FINANCE_ADMIN USER_PROVISIONING_ADMIN USER_SSA_USER USER_STAFF"
	"C_EVERYONE=USER_CUSTOMER_ACCOUNT_MEMBER USER_CUSTOMER_ADMIN USER_CUSTOMER_BUYER USER_CUSTOMER_MEMBER USER_CUSTOMER_NO_ROLE USER_CUSTOMER_NO_ROLE_PROJECT USER_CUSTOMER_PROJECT_ADMIN USER_CUSTOMER_REQUESTER USER_FINANCE_ADMIN USER_PARTNER_ACCOUNT_ADMIN USER_PARTNER_ADMIN USER_PARTNER_MEMBER USER_PROVISIONING_ADMIN USER_PUBLISHER_ADMIN USER_SSA_USER USER_STAFF"
	"C_PARTNERS=USER_PARTNER_ACCOUNT_ADMIN USER_PARTNER_ADMIN USER_PARTNER_MEMBER"
	"C_SUPPORT_CUSTOMERS=USER_CUSTOMER_ACCOUNT_MEMBER USER_CUSTOMER_ADMIN USER_CUSTOMER_BUYER USER_CUSTOMER_MEMBER USER_CUSTOMER_NO_ROLE USER_CUSTOMER_NO_ROLE_PROJECT USER_CUSTOMER_PROJECT_ADMIN USER_CUSTOMER_REQUESTER"
)

ROLE_MEMBERSHIPS=(
	"C_FINANCE_ADMIN=USER_FINANCE_ADMIN"
	"C_MARKETPLACE_PUBLISHER=USER_PUBLISHER_ADMIN test@liferay.com"
	"C_PROVISIONING_ADMIN=USER_PROVISIONING_ADMIN"
)

function main {
	_require_local_seed_target

	_acquire_oauth_token

	local membership

	for membership in "${GROUP_MEMBERSHIPS[@]}"
	do
		_assign_user_group "${membership%%=*}" "${membership#*=}"
	done

	for membership in "${ROLE_MEMBERSHIPS[@]}"
	do
		_assign_role "${membership%%=*}" "${membership#*=}"
	done
}

function _assign_role {
	local role_external_reference_code="${1}"
	local user_account_external_reference_codes="${2}"

	local user_account_external_reference_code

	for user_account_external_reference_code in ${user_account_external_reference_codes}
	do
		local user_id

		user_id=$(_resolve_user_id "${user_account_external_reference_code}")

		if [[ -z ${user_id} ]]
		then
			continue
		fi

		local status

		status=$(_curl \
			--output /dev/null \
			--request POST \
			--write-out "%{http_code}" \
			"${ROLE_URL}/by-external-reference-code/${role_external_reference_code}/association/user-account/${user_id}")

		if [[ ${status} == 2* ]]
		then
			echo "Assigned ${user_account_external_reference_code} the ${role_external_reference_code} role."
		else
			_warn "Unable to assign ${role_external_reference_code} to ${user_account_external_reference_code} (HTTP ${status})."
		fi
	done
}

function _assign_user_group {
	local user_group_external_reference_code="${1}"
	local user_account_external_reference_codes="${2}"

	local user_ids=()

	local user_account_external_reference_code

	for user_account_external_reference_code in ${user_account_external_reference_codes}
	do
		local user_id

		user_id=$(_resolve_user_id "${user_account_external_reference_code}")

		if [[ -n ${user_id} ]]
		then
			user_ids+=("${user_id}")
		fi
	done

	if [[ ${#user_ids[@]} -eq 0 ]]
	then
		_warn "No users resolved for ${user_group_external_reference_code}."

		return 1
	fi

	local body

	body=$(printf '%s\n' "${user_ids[@]}" | python3 -c "import json, sys; print(json.dumps([int(line) for line in sys.stdin.read().split()]))")

	local status

	status=$(_curl \
		--data "${body}" \
		--header "Content-Type: application/json" \
		--output /dev/null \
		--request POST \
		--write-out "%{http_code}" \
		"${USER_GROUP_URL}/by-external-reference-code/${user_group_external_reference_code}/user-group-users")

	if [[ ${status} == 2* ]]
	then
		echo "Assigned ${#user_ids[@]} user(s) to ${user_group_external_reference_code}."

		return 0
	fi

	_warn "Unable to assign users to ${user_group_external_reference_code} (HTTP ${status})."

	return 1
}

function _resolve_user_id {
	local identifier="${1}"

	local user_id

	if [[ ${identifier} == *"@"* ]]
	then
		user_id=$(_curl \
			--get \
			--data-urlencode "filter=emailAddress eq '${identifier}'" \
			"${USER_ACCOUNT_URL}" \
			| python3 -c "
import json
import sys

try:
	items = json.load(sys.stdin).get('items', [])

	print(items[0]['id'] if items else '')
except Exception:
	print('')
")
	else
		user_id=$(_curl \
			"${USER_ACCOUNT_URL}/by-external-reference-code/${identifier}" \
			| _json_field "id")
	fi

	if [[ -z ${user_id} ]]
	then
		_warn "Unable to resolve user \"${identifier}\"."
	fi

	echo "${user_id}"
}

main "${@}"