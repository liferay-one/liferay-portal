#!/usr/bin/env bash

#
# Syncs a subset of accounts to JSM through the liferay-one-etc-spring-boot
# sync-to-jsm endpoint, and reports how long the syncs took and how long a
# full sync of every account would take at the same rate.
#
# Usage:
#
# scripts/jsm-sync-test.sh [--dry-run] <external reference code>...
# scripts/jsm-sync-test.sh [--dry-run] --file <file>
# scripts/jsm-sync-test.sh [--dry-run] --count <number>
# scripts/jsm-sync-test.sh --generate <file> [--count <number>]
#
# The first form syncs the named accounts. The second form syncs the accounts
# in a file that holds one external reference code per line, and ignores
# blank lines and text after a #. The third form syncs the first <number>
# accounts that Liferay returns. --dry-run lists the accounts that the run
# would sync, and syncs none of them.
#
# --generate writes every account, or the first <number> accounts, to a new
# file in the format that --file reads, with each account name as a comment.
# Remove the lines for accounts that you do not want, then pass the file to
# --file.
#
# Requires these environment variables:
#
# LIFERAY_URL The Liferay base URL.
# CX_URL The Spring Boot client extension base URL.
# LIFERAY_OAUTH_CLIENT_ID An OAuth2 client that the client extension
# LIFERAY_OAUTH_CLIENT_SECRET accepts. Its client credentials user must
# have the Administrator or Provisioning
# Administrator role.
#
# Status messages go to stderr with a timestamp, so each failure shows the
# step it happened in. Results go to stdout.
#
# Requires bash 3.2 or newer, curl, and jq.
#

set -o errexit
set -o nounset
set -o pipefail

function main {
	_DRY_RUN=false

	local argument
	local arguments=()

	for argument in ${1+"$@"}
	do
		if [[ ${argument} == --dry-run ]]
		then
			_DRY_RUN=true
		else
			arguments+=("${argument}")
		fi
	done

	set -- ${arguments[@]+"${arguments[@]}"}

	if [[ $# -eq 0 ]] || [[ ${1} == --help ]] || [[ ${1} == -h ]]
	then
		sed -n '3,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'

		exit 0
	fi

	_check_environment

	_TOKEN=$(_get_token)

	if [[ ${1} == --generate ]]
	then
		_generate_file ${1+"$@"}

		return 0
	fi

	local external_reference_codes

	if [[ ${1} == --count ]]
	then
		if [[ $# -ne 2 ]] || [[ ! ${2} =~ ^[1-9][0-9]*$ ]]
		then
			_error "--count requires a positive number."

			exit 1
		fi

		_log "Listing the first ${2} accounts from Liferay."

		external_reference_codes=$(_get_accounts "${2}" | cut -f 1)

		_log "Listed $(_count_lines "${external_reference_codes}") accounts."
	elif [[ ${1} == --file ]]
	then
		if [[ $# -ne 2 ]] || [[ ! -f ${2} ]]
		then
			_error "--file requires an existing file."

			exit 1
		fi

		_log "Reading accounts from ${2}."

		external_reference_codes=$(sed -e 's/#.*//' -e 's/[[:space:]]//g' "${2}" | grep -v '^$') || true

		if [[ -z ${external_reference_codes} ]]
		then
			_error "The file ${2} lists no accounts."

			exit 1
		fi

		_log "Read $(_count_lines "${external_reference_codes}") accounts."
	else
		external_reference_codes=$(printf '%s\n' ${1+"$@"})

		_log "Using the $(_count_lines "${external_reference_codes}") accounts named on the command line."
	fi

	if [[ ${_DRY_RUN} == true ]]
	then
		echo "${external_reference_codes}"
		echo
		echo "Dry run. Would sync $(_count_lines "${external_reference_codes}") accounts through ${CX_URL}."

		return 0
	fi

	_sync_accounts "${external_reference_codes}"
}

function _check_environment {
	local missing=""
	local variable

	for variable in CX_URL LIFERAY_OAUTH_CLIENT_ID LIFERAY_OAUTH_CLIENT_SECRET LIFERAY_URL
	do
		if [[ -z ${!variable:-} ]]
		then
			missing="${missing} ${variable}"
		fi
	done

	if [[ -n ${missing} ]]
	then
		_error "Set these environment variables:${missing}"

		exit 1
	fi

	CX_URL="${CX_URL%/}"
	LIFERAY_URL="${LIFERAY_URL%/}"

	_log "Using Liferay at ${LIFERAY_URL} and the client extension at ${CX_URL}."
}

function _count_lines {
	wc -l <<< "${1}" | tr -d ' '
}

function _curl {
	curl \
		--header "Authorization: Bearer ${_TOKEN}" \
		--silent \
		${1+"$@"}
}

function _generate_file {
	local file="${2:-}"

	if [[ -z ${file} ]] || [[ ${file} == --count ]]
	then
		_error "--generate requires a file."

		exit 1
	fi

	if [[ -e ${file} ]]
	then
		_error "The file ${file} already exists."

		exit 1
	fi

	local count

	if [[ $# -eq 2 ]]
	then
		_log "Counting the accounts in Liferay."

		count=$(_get_account_total_count)

		_log "Liferay has ${count} accounts."
	elif [[ $# -eq 4 ]] && [[ ${3} == --count ]] && [[ ${4} =~ ^[1-9][0-9]*$ ]]
	then
		count="${4}"
	else
		_error "--generate takes a file and an optional --count <number>."

		exit 1
	fi

	_log "Listing ${count} accounts from Liferay."

	local accounts

	accounts=$(_get_accounts "${count}")

	_log "Writing ${file}."

	{
		echo "# Accounts for scripts/jsm-sync-test.sh --file. Remove the lines for"
		echo "# accounts that you do not want to sync."
		echo
		awk -F '\t' '{ printf "%s  # %s\n", $1, $2 }' <<< "${accounts}"
	} > "${file}"

	echo "Wrote $(_count_lines "${accounts}") accounts to ${file}."
}

# Prints the external reference code and name of the first <count> accounts,
# separated by a tab.

function _get_accounts {
	local count="${1}"

	local page=1
	local page_size=200

	if [[ ${count} -lt ${page_size} ]]
	then
		page_size="${count}"
	fi

	local remaining="${count}"

	while [[ ${remaining} -gt 0 ]]
	do
		local response

		response=$(_get_accounts_page "${page}" "${page_size}")

		local accounts

		accounts=$(jq --raw-output '.items[] | [.externalReferenceCode, .name] | @tsv' <<< "${response}" | head -n "${remaining}")

		if [[ -z ${accounts} ]]
		then
			break
		fi

		echo "${accounts}"

		remaining=$((remaining - $(_count_lines "${accounts}")))

		_log "Read page ${page} of the account list. $((count - remaining)) of ${count} accounts listed."

		page=$((page + 1))
	done
}

function _get_account_total_count {
	_get_accounts_page 1 1 | jq --raw-output '.totalCount'
}

function _get_accounts_page {
	local page="${1}"
	local page_size="${2}"

	local response

	response=$(_curl \
		--write-out '\n%{http_code}' \
		"${LIFERAY_URL}/o/headless-admin-user/v1.0/accounts?fields=externalReferenceCode,name&page=${page}&pageSize=${page_size}") || true

	local status="${response##*$'\n'}"

	if [[ ${status} != 200 ]]
	then
		_error "Liferay returned HTTP ${status} for page ${page} of the account list. Response: $(_truncate "${response%$'\n'*}")"

		exit 1
	fi

	echo "${response%$'\n'*}"
}

function _get_token {
	_log "Requesting an OAuth2 token for client ${LIFERAY_OAUTH_CLIENT_ID}."

	local response

	response=$(curl \
		--data-urlencode "client_id=${LIFERAY_OAUTH_CLIENT_ID}" \
		--data-urlencode "client_secret=${LIFERAY_OAUTH_CLIENT_SECRET}" \
		--data-urlencode "grant_type=client_credentials" \
		--silent \
		--write-out '\n%{http_code}' \
		"${LIFERAY_URL}/o/oauth2/token") || true

	local status="${response##*$'\n'}"

	response="${response%$'\n'*}"

	local token

	token=$(jq --raw-output '.access_token // empty' <<< "${response}" 2>/dev/null) || true

	if [[ -z ${token} ]]
	then
		_error "Unable to get an OAuth2 token from ${LIFERAY_URL} for client ${LIFERAY_OAUTH_CLIENT_ID}. HTTP ${status}, where 000 means no connection. Response: $(_truncate "${response}")"

		exit 1
	fi

	_log "Got an OAuth2 token."

	echo "${token}"
}

function _sync_accounts {
	local external_reference_codes="${1}"

	local fail_count=0
	local index=0
	local pass_count=0
	local seconds_list=""

	local total

	total=$(_count_lines "${external_reference_codes}")

	_log "Syncing ${total} accounts through ${CX_URL}."

	local body_file

	body_file=$(mktemp)

	local external_reference_code

	while IFS= read -r external_reference_code
	do
		index=$((index + 1))

		local response

		response=$(_curl \
			--output "${body_file}" \
			--request POST \
			--write-out '%{http_code} %{time_total}' \
			"${CX_URL}/accounts/$(jq --null-input --raw-output --arg value "${external_reference_code}" '$value | @uri')/sync-to-jsm") || true

		local status="${response%% *}"
		local seconds="${response##* }"

		echo "[${index}/${total}] ${external_reference_code} HTTP ${status} ${seconds}s"

		seconds_list="${seconds_list} ${seconds}"

		if [[ ${status} == 200 ]]
		then
			pass_count=$((pass_count + 1))
		else
			fail_count=$((fail_count + 1))

			_error "The sync of ${external_reference_code} failed with HTTP ${status}. Response: $(_truncate "$(cat "${body_file}")")"
		fi
	done <<< "${external_reference_codes}"

	rm -f "${body_file}"

	_log "Counting the accounts in Liferay for the estimate."

	local account_total_count

	account_total_count=$(_get_account_total_count)

	echo

	echo "${seconds_list}" | awk \
		-v account_total_count="${account_total_count}" \
		-v fail_count="${fail_count}" \
		-v pass_count="${pass_count}" \
		'{
			for (i = 1; i <= NF; i++) {
				sum += $i
			}

			printf "Synced %d accounts in %.1fs (%.2fs each): %d passed, %d failed.\n", NF, sum, sum / NF, pass_count, fail_count
			printf "Estimated full sync of %d accounts at this rate: %.0fm.\n", account_total_count, sum / NF * account_total_count / 60
		}'

	if [[ ${fail_count} -gt 0 ]]
	then
		exit 1
	fi
}

function _error {
	echo "[$(date +%H:%M:%S)] ERROR ${*}" >&2
}

function _log {
	echo "[$(date +%H:%M:%S)] ${*}" >&2
}

# Prints the first 300 characters of a response on one line.

function _truncate {
	echo "${1}" | tr '\n' ' ' | cut -c 1-300
}

main ${1+"$@"}