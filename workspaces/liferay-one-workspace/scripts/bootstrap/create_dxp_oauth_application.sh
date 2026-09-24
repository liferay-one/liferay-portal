#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# Create the OAuth2 application a customer's DXP uses to connect to One.
#
# Every DXP since 2025.Q1 ships marketplace-settings-web, whose Connect step runs
# an OAuth2 Authorization Code flow with PKCE against the portal property
# marketplace.url, using the client id in marketplace.client.id (default
# "marketplace-client-id") and the redirect URI marketplace.url plus
# marketplace.redirect. The DXP is a public client, keeps the refresh token, and
# renews the access token with grant_type=refresh_token, so the application must
# allow both the PKCE and the Refresh Token grants and register every redirect
# URI a DXP may send, byte for byte.
#
# The oAuthApplicationUserAgent client extension type cannot provide this
# application: it generates a random client id and grants only PKCE and JWT
# Bearer. Liferay exposes no headless API for OAuth2 application admin, and the
# JSONWS bridge cannot take the grant type enum list the add method needs, so this
# step drives the OAuth2 admin portlet action URLs with an admin session, the
# same way the one-oauth-app skill creates the local-dev application. The step is
# idempotent: when an application with the client id already exists it is
# updated in place, so the redirect URIs, grants and scopes converge on the
# values below on every bootstrap and env reset.
#
# The Spring Boot client extension accepts the tokens this application issues
# through the external-dxp entry in liferay.oauth.application.external.reference
# .codes, whose client id is declared in application-default.properties; the
# application therefore needs no external reference code.
#
# The delivery cart API registers no OAuth2 scope aliases and accepts any
# valid token, so only the catalog and order delivery APIs and the user account
# read the Spring Boot needs are granted.
#
# Overrides (all optional):
# DXP_OAUTH_CLIENT_ID (default marketplace-client-id)
# DXP_OAUTH_REDIRECT_URIS space separated (default: the local hosts below)
# DXP_OAUTH_SCOPE_ALIASES space separated (default: the APIs the DXP calls)

DXP_OAUTH_APPLICATION_NAME="Marketplace DXP Connector"
DXP_OAUTH_CLIENT_ID="${DXP_OAUTH_CLIENT_ID:-marketplace-client-id}"
DXP_OAUTH_REDIRECT_URIS="${DXP_OAUTH_REDIRECT_URIS:-${LIFERAY_URL}/authorize http://one.localhost/authorize http://one.localhost:8080/authorize}"
DXP_OAUTH_SCOPE_ALIASES="${DXP_OAUTH_SCOPE_ALIASES:-Liferay.Headless.Admin.User.everything.read Liferay.Headless.Commerce.Delivery.Catalog.everything Liferay.Headless.Commerce.Delivery.Order.everything}"

LOGIN_PORTLET="com_liferay_login_web_portlet_LoginPortlet"
OAUTH_PORTLET="com_liferay_oauth2_provider_web_internal_portlet_OAuth2AdminPortlet"

OAUTH_LIST_URL="${LIFERAY_URL}/group/control_panel/manage?p_p_id=${OAUTH_PORTLET}&p_p_lifecycle=0&p_p_state=maximized"

function main {
	local cookie_jar

	cookie_jar=$(mktemp)

	trap "rm -f '${cookie_jar}'" EXIT

	_log_in "${cookie_jar}"

	# The CSRF token for portlet action URLs is the page's global
	# Liferay.authToken, bound to the authenticated session. It is harvested once
	# and reused for every action POST below.

	local p_auth

	p_auth=$(_curl_session "${cookie_jar}" "${OAUTH_LIST_URL}" | _read_auth_token)

	if [[ -z ${p_auth} ]]
	then
		echo "Unable to read the CSRF token from the OAuth2 admin page." >&2

		return 1
	fi

	local application_id

	application_id=$(_curl_session "${cookie_jar}" "${OAUTH_LIST_URL}" | _read_application_id "${DXP_OAUTH_CLIENT_ID}" || true)

	_save_application "${cookie_jar}" "${p_auth}" "${application_id:-0}"

	application_id=$(_curl_session "${cookie_jar}" "${OAUTH_LIST_URL}" | _read_application_id "${DXP_OAUTH_CLIENT_ID}" || true)

	if [[ -z ${application_id} ]]
	then
		echo "Unable to find the OAuth2 application with client id ${DXP_OAUTH_CLIENT_ID} after saving it." >&2

		return 1
	fi

	_assign_scopes "${cookie_jar}" "${p_auth}" "${application_id}"

	_verify_authorize_endpoint

	echo "OAuth2 application ${DXP_OAUTH_APPLICATION_NAME} (client id ${DXP_OAUTH_CLIENT_ID}, id ${application_id}) is ready for DXP connections."
}

function _assign_scopes {
	local cookie_jar="${1}"
	local p_auth="${2}"
	local application_id="${3}"

	# The assign-scopes page renders every alias the portal knows as a checkbox
	# value, so the requested aliases are checked against it before posting; an
	# alias the portal does not have would otherwise be dropped silently.

	local assign_page_url="${OAUTH_LIST_URL}&_${OAUTH_PORTLET}_mvcRenderCommandName=%2Foauth2_provider%2Fassign_scopes&_${OAUTH_PORTLET}_navigation=assign_scopes&_${OAUTH_PORTLET}_oAuth2ApplicationId=${application_id}"

	local available_scope_aliases

	available_scope_aliases=$(_curl_session "${cookie_jar}" "${assign_page_url}" | _read_scope_aliases)

	local scope_alias
	local scope_arguments=()

	for scope_alias in ${DXP_OAUTH_SCOPE_ALIASES}
	do
		if ! grep --line-regexp --quiet "${scope_alias}" <<< "${available_scope_aliases}"
		then
			echo "Scope alias ${scope_alias} is not available on ${LIFERAY_URL}." >&2

			return 1
		fi

		scope_arguments+=(--data-urlencode "_${OAUTH_PORTLET}_scopeAliases=${scope_alias}")
	done

	local assign_action_url="${LIFERAY_URL}/group/control_panel/manage?p_p_id=${OAUTH_PORTLET}&p_p_lifecycle=1&_${OAUTH_PORTLET}_jakarta.portlet.action=%2Foauth2_provider%2Fassign_scopes&p_auth=${p_auth}"

	_curl_session "${cookie_jar}" \
		--data-urlencode "_${OAUTH_PORTLET}_oAuth2ApplicationId=${application_id}" \
		"${scope_arguments[@]}" \
		--location \
		--output /dev/null \
		--request POST \
		"${assign_action_url}"

	echo "Assigned scopes to OAuth2 application ${DXP_OAUTH_CLIENT_ID}: ${DXP_OAUTH_SCOPE_ALIASES}."
}

function _curl_session {
	local cookie_jar="${1}"

	shift

	curl \
		--cookie "${cookie_jar}" \
		--cookie-jar "${cookie_jar}" \
		--silent \
		"${@}"
}

function _log_in {
	local cookie_jar="${1}"

	local login_url="${LIFERAY_URL}/web/guest/home?p_p_id=${LOGIN_PORTLET}&p_p_state=maximized"

	local p_auth

	p_auth=$(_curl_session "${cookie_jar}" "${login_url}" | _read_auth_token)

	_curl_session "${cookie_jar}" \
		--data-urlencode "_${LOGIN_PORTLET}_login=${LIFERAY_ADMIN_EMAIL}" \
		--data-urlencode "_${LOGIN_PORTLET}_password=${LIFERAY_ADMIN_PASSWORD}" \
		--location \
		--output /dev/null \
		--request POST \
		"${login_url}&p_p_lifecycle=1&_${LOGIN_PORTLET}_jakarta.portlet.action=%2Flogin%2Flogin&p_auth=${p_auth}"

	if ! grep --quiet $'\tID\t' "${cookie_jar}"
	then
		echo "Unable to log in to ${LIFERAY_URL} as ${LIFERAY_ADMIN_EMAIL}." >&2

		return 1
	fi
}

function _read_application_id {
	python3 -c "
import re
import sys

client_id = sys.argv[1]

html = sys.stdin.read()

for match in re.finditer(r'<tr\b[^>]*>(.*?)</tr>', html, re.DOTALL):
	row = match.group(1)

	if client_id not in row:
		continue

	id_match = re.search(r'oAuth2ApplicationId=(\d+)', row)

	if id_match:
		print(id_match.group(1))

		sys.exit(0)

sys.exit(1)
" "${1}"
}

# The token is the Liferay.authToken JS variable, not a p_auth query parameter:
# the control panel chrome renders per portlet p_p_auth render tokens on its nav
# links, and one of those fails CSRF validation on an action POST.

function _read_auth_token {
	grep --only-matching --extended-regexp "authToken: '[A-Za-z0-9]+'" | head --lines 1 | cut --delimiter "'" --fields 2
}

function _read_scope_aliases {
	python3 -c "
import re
import sys

html = sys.stdin.read()

for match in re.finditer(r'name=\"[^\"]*_scopeAliases\"[^>]*value=\"([^\"]+)\"|value=\"([^\"]+)\"[^>]*name=\"[^\"]*_scopeAliases\"', html):
	for alias in (match.group(1) or match.group(2)).split():
		print(alias)
"
}

function _save_application {
	local cookie_jar="${1}"
	local p_auth="${2}"
	local application_id="${3}"

	# Client profile 5 is Other, the only profile that offers every grant type,
	# and client authentication method none makes the client public: the DXP has
	# no secret to send. Marking the application trusted skips the consent
	# screen inside the 500 px popup the DXP opens.

	local redirect_uris

	redirect_uris=$(printf '%s\n' ${DXP_OAUTH_REDIRECT_URIS})

	local update_action_url="${LIFERAY_URL}/group/control_panel/manage?p_p_id=${OAUTH_PORTLET}&p_p_lifecycle=1&_${OAUTH_PORTLET}_jakarta.portlet.action=%2Foauth2_provider%2Fupdate_oauth2_application&p_auth=${p_auth}"

	_curl_session "${cookie_jar}" \
		--data-urlencode "_${OAUTH_PORTLET}_clientAuthenticationMethod=none" \
		--data-urlencode "_${OAUTH_PORTLET}_clientId=${DXP_OAUTH_CLIENT_ID}" \
		--data-urlencode "_${OAUTH_PORTLET}_clientProfile=5" \
		--data-urlencode "_${OAUTH_PORTLET}_grant-AUTHORIZATION_CODE_PKCE=true" \
		--data-urlencode "_${OAUTH_PORTLET}_grant-REFRESH_TOKEN=true" \
		--data-urlencode "_${OAUTH_PORTLET}_homePageURL=${LIFERAY_URL}" \
		--data-urlencode "_${OAUTH_PORTLET}_name=${DXP_OAUTH_APPLICATION_NAME}" \
		--data-urlencode "_${OAUTH_PORTLET}_oAuth2ApplicationId=${application_id}" \
		--data-urlencode "_${OAUTH_PORTLET}_redirectURIs=${redirect_uris}" \
		--data-urlencode "_${OAUTH_PORTLET}_trustedApplication=true" \
		--location \
		--output /dev/null \
		--request POST \
		"${update_action_url}"

	if [[ ${application_id} == "0" ]]
	then
		echo "Created OAuth2 application ${DXP_OAUTH_CLIENT_ID} with redirect URIs: ${DXP_OAUTH_REDIRECT_URIS}."
	else
		echo "Updated OAuth2 application ${DXP_OAUTH_CLIENT_ID} (id ${application_id}) with redirect URIs: ${DXP_OAUTH_REDIRECT_URIS}."
	fi
}

# A guest request to the authorize endpoint with the registered client id and
# first redirect URI must answer with a redirect to the login page. A 400 means
# the client id or the redirect URI did not register the way the DXP sends them.

function _verify_authorize_endpoint {
	local redirect_uri="${DXP_OAUTH_REDIRECT_URIS%% *}"

	local status

	status=$(curl \
		--get \
		--data-urlencode "client_id=${DXP_OAUTH_CLIENT_ID}" \
		--data-urlencode "code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" \
		--data-urlencode "code_challenge_method=S256" \
		--data-urlencode "redirect_uri=${redirect_uri}" \
		--data-urlencode "response_type=code" \
		--output /dev/null \
		--silent \
		--write-out "%{http_code}" \
		"${LIFERAY_URL}/o/oauth2/authorize")

	if [[ ${status} != 302 ]]
	then
		echo "The authorize endpoint answered ${status} for client id ${DXP_OAUTH_CLIENT_ID} and redirect URI ${redirect_uri}; expected 302." >&2

		return 1
	fi
}

main "${@}"