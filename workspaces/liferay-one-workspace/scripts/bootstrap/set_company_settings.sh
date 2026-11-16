#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# Force admin basic auth before sourcing the common helpers. Updating the
# company is a JSONWS admin operation, and JSONWS does not accept the seed's
# scoped OAuth token.

export LIFERAY_AUTH_MODE=basic

source ../_common.sh

# Give the instance the name Liferay One and the landing page of the One site.
#
# The instance name is the suffix of every HTML title on the One site, because
# the instance settings client extension turns on includeInstanceName and turns
# off includeSiteName in LayoutSEOGeneralGroupConfiguration for the One site.
# The instance name is also the name that the Guest site shows. Liferay Cloud
# names an instance after its web ID, so without this the home page title is
# "Home - one.liferay.net".
#
# The landing page is where a sign in with no redirect parameter goes.
# DefaultLandingPageAction does nothing when default.landing.page.path is
# empty, and the portal then sends the user to company.default.home.url, which
# is /web/guest. A sign in with a redirect parameter still goes to that page,
# because the login portlet reads the parameter first.
#
# The company name and default.landing.page.path are company fields, not OSGi
# configuration, so no client extension can set them. This script sets them on
# local environments so that they match production. On one-uat and production,
# an administrator sets them by hand in Instance Settings.
#
# The script reads each value before it writes it, so it is safe on every
# bootstrap and env reset. Keep sorted.

COMPANY_NAME="Liferay One"
DEFAULT_LANDING_PAGE_PATH="/web/one/home"

function main {
	_acquire_oauth_token

	local virtual_host="${LIFERAY_URL#*://}"

	virtual_host="${virtual_host%%/*}"
	virtual_host="${virtual_host%%:*}"

	# CompanyService.updateCompany sets the virtual host to the value it gets,
	# and the company JSON does not include the virtual host. So the company is
	# found by the host of LIFERAY_URL, and that host is the value passed back.
	# A host that is not the virtual host of a company resolves to nothing, and
	# the script stops rather than bind the default company to it.

	local company

	company=$(_curl \
		--get \
		--data-urlencode "virtualHost=${virtual_host}" \
		"${LIFERAY_URL}/api/jsonws/company/get-company-by-virtual-host" || true)

	local company_id

	company_id=$(echo "${company}" | _json_field "companyId")

	if [[ -z ${company_id} ]]
	then
		echo "Unable to find the company with the virtual host ${virtual_host}." >&2

		return 1
	fi

	_set_default_landing_page_path "${company_id}" &&
	_set_company_name "${company}" "${virtual_host}"
}

function _read_company_field {
	local field="${1}"

	python3 -c "
import json
import sys

value = json.load(sys.stdin).get('${field}', '')

print('' if value is None else value)
"
}

function _set_company_name {
	local company="${1}"
	local virtual_host="${2}"

	if [[ $(echo "${company}" | _read_company_field "name") == "${COMPANY_NAME}" ]]
	then
		echo "Company name is already ${COMPANY_NAME}."

		return 0
	fi

	# CompanyService.updateCompany sets every account field it gets, so each
	# field other than the name is passed back with its current value. The logo
	# is kept when hasLogo is true and logoBytes is null, and removed when
	# hasLogo is false, so hasLogo follows the current logo ID.

	local has_logo=false

	if [[ $(echo "${company}" | _read_company_field "logoId") -gt 0 ]]
	then
		has_logo=true
	fi

	local arguments=(
		--data-urlencode "companyId=$(echo "${company}" | _read_company_field "companyId")"
		--data-urlencode "hasLogo=${has_logo}"
		--data-urlencode "homeURL=$(echo "${company}" | _read_company_field "homeURL")"
		--data-urlencode "industry=$(echo "${company}" | _read_company_field "industry")"
		--data-urlencode "legalId=$(echo "${company}" | _read_company_field "legalId")"
		--data-urlencode "legalName=$(echo "${company}" | _read_company_field "legalName")"
		--data-urlencode "legalType=$(echo "${company}" | _read_company_field "legalType")"
		--data-urlencode "-logoBytes="
		--data-urlencode "mx=$(echo "${company}" | _read_company_field "mx")"
		--data-urlencode "name=${COMPANY_NAME}"
		--data-urlencode "sicCode=$(echo "${company}" | _read_company_field "sicCode")"
		--data-urlencode "size=$(echo "${company}" | _read_company_field "size")"
		--data-urlencode "tickerSymbol=$(echo "${company}" | _read_company_field "tickerSymbol")"
		--data-urlencode "type=$(echo "${company}" | _read_company_field "type")"
		--data-urlencode "virtualHost=${virtual_host}"
	)

	local response

	response=$(_curl \
		"${arguments[@]}" \
		--request POST \
		"${LIFERAY_URL}/api/jsonws/company/update-company" || true)

	if [[ $(echo "${response}" | _read_company_field "name" 2> /dev/null) != "${COMPANY_NAME}" ]]
	then
		echo "Unable to set the company name to ${COMPANY_NAME}. ${response}" >&2

		return 1
	fi

	echo "Set the company name to ${COMPANY_NAME}."
}

# JSONWS has no getter for one company preference, so the landing page is
# written on every run. The write is idempotent.

function _set_default_landing_page_path {
	local company_id="${1}"

	local status

	status=$(_curl \
		--data-urlencode "companyId=${company_id}" \
		--data-urlencode "unicodeProperties={\"default.landing.page.path\":\"${DEFAULT_LANDING_PAGE_PATH}\"}" \
		--output /dev/null \
		--request POST \
		--write-out "%{http_code}" \
		"${LIFERAY_URL}/api/jsonws/company/update-preferences" || true)

	if [[ ${status} != 2* ]]
	then
		echo "Unable to set the default landing page path to ${DEFAULT_LANDING_PAGE_PATH}." >&2

		return 1
	fi

	echo "Set the default landing page path to ${DEFAULT_LANDING_PAGE_PATH}."
}

main "${@}"