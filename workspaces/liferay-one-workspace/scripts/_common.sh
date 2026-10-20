#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_batch_import_lock.sh"

set -o errexit
set -o nounset
set -o pipefail

# macOS ships bash 3.2 (frozen there for GPLv3 licensing reasons), which lacks
# associative arrays and mishandles "$@" under nounset. These scripts require
# bash 4.4+; fail fast here instead of letting callers hit a cryptic syntax or
# "unbound variable" error deep in whichever script happens to run first.

if ((BASH_VERSINFO[0] < 4)) || ((BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] < 4))
then
	echo "This workspace's scripts require bash 4.4 or newer (found ${BASH_VERSION})." >&2
	echo "On macOS: brew install bash, then make sure Homebrew's bin directory precedes /bin in PATH." >&2

	exit 1
fi

# Connection and authentication helpers shared by the bootstrap seed scripts and
# the teardown scripts. The seed scripts create data through the headless and
# object REST APIs; the teardown scripts delete it. Both speak to the same
# Liferay instance with the same credentials, so the configuration and the
# authenticated _curl wrapper live here.
#
# Requests authenticate with an OAuth2 client-credentials bearer token by
# default. The token is requested with exactly the scopes the seed and teardown
# touch -- the headless and object-admin APIs plus the per-object entry scopes
# (<lowercase-object-name>.everything) derived from the batch object
# definitions -- so the resulting JWT stays well under Tomcat's 8 KB
# maxHttpHeaderSize, which an unscoped all-scopes token would exceed.
#
# Overrides (all optional):
# LIFERAY_OAUTH_CLIENT_ID (default local-dev)
# LIFERAY_OAUTH_CLIENT_SECRET (default local-dev-secret)
# LIFERAY_OAUTH_TOKEN_URL (default ${LIFERAY_URL}/o/oauth2/token)
# LIFERAY_OAUTH_SCOPE (default: the derived scope list)
# LIFERAY_OAUTH_TOKEN (a pre-minted token; skips the token request)
# LIFERAY_AUTH_MODE oauth (default) or basic (admin credentials)

# The workspace-relative paths below are anchored to the workspace root, resolved
# from this file's own location, so the helpers work no matter which directory
# the sourcing script lives in (scripts/ or scripts/seed/).

_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WORKSPACE_ROOT="$(cd "${_SCRIPTS_DIR}/.." && pwd)"

# Load the configuration from the workspace .env (at the workspace root) so a
# single source of truth drives both the docker compose
# stack and these scripts. Only the known LIFERAY_* keys are read, and a key
# already present in the environment wins -- so an explicit "export
# LIFERAY_URL=..." on the command line still overrides the file. The file is
# never sourced, because it also holds values such as an unquoted JSON service
# account key that bash could not evaluate as assignments.

LIFERAY_ENV_FILE="${LIFERAY_ENV_FILE:-${WORKSPACE_ROOT}/.env}"

if [[ -f ${LIFERAY_ENV_FILE} ]]
then
	for _env_key in \
		LIFERAY_ADMIN_EMAIL \
		LIFERAY_ADMIN_PASSWORD \
		LIFERAY_AUTH_MODE \
		LIFERAY_OAUTH_CLIENT_ID \
		LIFERAY_OAUTH_CLIENT_SECRET \
		LIFERAY_OAUTH_SCOPE \
		LIFERAY_OAUTH_TOKEN \
		LIFERAY_OAUTH_TOKEN_URL \
		LIFERAY_SEED_REMOTE \
		LIFERAY_URL
	do
		[[ -n ${!_env_key:-} ]] && continue

		_env_line=$(grep -E "^${_env_key}=" "${LIFERAY_ENV_FILE}" | tail -n 1) || true

		[[ -n ${_env_line} ]] && export "${_env_key}=${_env_line#*=}"
	done

	unset _env_key _env_line
fi

LIFERAY_URL="${LIFERAY_URL:-http://localhost:8080}"

# The Docker stack that the bootstrap and reset scripts drive. The defaults
# match docker-compose.yaml, which reads the same variables. Set them to run a
# second stack on one Docker daemon, or to drive a server on another machine
# through DOCKER_HOST. LIFERAY_BOOTSTRAP_URL is separate from LIFERAY_URL on
# purpose: the workspace .env may point LIFERAY_URL at a remote environment,
# and a bootstrap must never seed one.

LIFERAY_BOOTSTRAP_URL="${LIFERAY_BOOTSTRAP_URL:-http://localhost:8080}"
LIFERAY_CONTAINER_NAME="${LIFERAY_CONTAINER_NAME:-liferay}"
LIFERAY_IMAGE_TAG="${LIFERAY_IMAGE_TAG:-liferay:local}"
LIFERAY_SIDECAR_CONTAINER_NAME="${LIFERAY_SIDECAR_CONTAINER_NAME:-liferay-one-etc-spring-boot}"

LIFERAY_ADMIN_EMAIL="${LIFERAY_ADMIN_EMAIL:-test@liferay.com}"
LIFERAY_ADMIN_PASSWORD="${LIFERAY_ADMIN_PASSWORD:-test}"

LIFERAY_AUTH_MODE="${LIFERAY_AUTH_MODE:-oauth}"

LIFERAY_OAUTH_CLIENT_ID="${LIFERAY_OAUTH_CLIENT_ID:-local-dev}"
LIFERAY_OAUTH_CLIENT_SECRET="${LIFERAY_OAUTH_CLIENT_SECRET:-local-dev-secret}"
LIFERAY_OAUTH_TOKEN_URL="${LIFERAY_OAUTH_TOKEN_URL:-${LIFERAY_URL}/o/oauth2/token}"

BATCH_DIR="${BATCH_DIR:-${WORKSPACE_ROOT}/client-extensions/liferay-one-batch/batch}"

function get_gradle_property {
	local key=${1}

	local value

	value=$(_read_property "${key}" "${WORKSPACE_ROOT}/gradle-local.properties")

	if [[ -z ${value} ]]
	then
		value=$(_read_property "${key}" "${WORKSPACE_ROOT}/gradle.properties")
	fi

	if [[ -z ${value} ]]
	then
		_print_error "Property \"${key}\" was not found."

		return 1
	fi

	echo "${value}"
}

# A script has one EXIT trap, so a second trap command replaces the first. Add
# each cleanup with _add_exit_command instead. The trap runs every added command
# once, in the order the script added them.

_EXIT_COMMANDS=()

function _add_exit_command {
	local command="${1}"

	local exit_command

	for exit_command in ${_EXIT_COMMANDS[@]+"${_EXIT_COMMANDS[@]}"}
	do
		[[ ${exit_command} == "${command}" ]] && return 0
	done

	_EXIT_COMMANDS+=("${command}")

	trap _run_exit_commands EXIT
}

# Mints the OAuth2 client-credentials token used by every _curl call and caches
# it in _OAUTH_TOKEN. Call it once, at the top level of the sourcing script (the
# first statement of main, or at source time in the teardown common), so a
# failed mint exits the whole script rather than just a _curl subshell, and so
# the token is set before any command-substitution _curl runs. A no-op in basic
# auth mode or when a token was supplied through LIFERAY_OAUTH_TOKEN.

function _acquire_oauth_token {
	[[ ${LIFERAY_AUTH_MODE} == "basic" ]] && return 0

	if [[ -n ${LIFERAY_OAUTH_TOKEN:-} ]]
	then
		_OAUTH_TOKEN="${LIFERAY_OAUTH_TOKEN}"

		return 0
	fi

	local scope="${LIFERAY_OAUTH_SCOPE:-$(_oauth_scopes)}"

	local response

	response=$(curl \
		--silent \
		--data-urlencode "client_id=${LIFERAY_OAUTH_CLIENT_ID}" \
		--data-urlencode "client_secret=${LIFERAY_OAUTH_CLIENT_SECRET}" \
		--data-urlencode "grant_type=client_credentials" \
		--data-urlencode "scope=${scope}" \
		"${LIFERAY_OAUTH_TOKEN_URL}") || true

	_OAUTH_TOKEN=$(echo "${response}" | _json_field "access_token")

	if [[ -z ${_OAUTH_TOKEN} ]]
	then
		_warn "Unable to obtain an OAuth2 token from ${LIFERAY_OAUTH_TOKEN_URL} for client \"${LIFERAY_OAUTH_CLIENT_ID}\"."
		_warn "Response: ${response}"
		_warn "Create the local dev OAuth2 application first (run the one-oauth-app skill), or set LIFERAY_AUTH_MODE=basic to fall back to admin credentials."

		exit 1
	fi
}

function _curl {
	if [[ ${LIFERAY_AUTH_MODE} == "basic" ]]
	then
		curl \
			--silent \
			--user "${LIFERAY_ADMIN_EMAIL}:${LIFERAY_ADMIN_PASSWORD}" \
			"${@}"

		return
	fi

	curl \
		--silent \
		--header "Authorization: Bearer ${_OAUTH_TOKEN}" \
		"${@}"
}

function _json_field {
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

#
# instance.sh sets LIFERAY_BATCH_IMPORT_LOCK when it seeds a virtual instance
# on a shared server. Other targets have no lock to take.
#

function _lock_batch_import {
	if [ "${LIFERAY_BATCH_IMPORT_LOCK:-false}" == "true" ]
	then
		#
		# Free the lock when errexit ends the script during the import.
		# _unlock removes only a lock this process holds.
		#

		_add_exit_command "_unlock"

		_lock
	fi
}

function _log {
	echo "${@}"
}

# Prints the space-separated scope list the seed and teardown need: the headless
# and object-admin REST applications they call, plus one c_<lowercase-object-name>
# .everything entry per custom object defined in the batch, which is the scope
# the object's /o/c/... entry endpoints require. A custom object's REST
# application is named with the "c_" prefix it carries everywhere else (the
# "C_" database table prefix, lowercased), so the scope for the "Project" object
# is "c_project.everything", not "project.everything".

function _oauth_scopes {
	local scopes=(
		"Liferay.Headless.Admin.List.Type.everything"
		"Liferay.Headless.Admin.Taxonomy.everything"
		"Liferay.Headless.Admin.User.everything"
		"Liferay.Headless.Batch.Engine.everything"
		"Liferay.Headless.Commerce.Admin.Account.everything"
		"Liferay.Headless.Commerce.Admin.Catalog.everything"
		"Liferay.Headless.Commerce.Admin.Channel.everything"
		"Liferay.Headless.Commerce.Admin.Order.everything"
		"Liferay.Headless.Commerce.Admin.Pricing.everything"
		"Liferay.Headless.Delivery.everything"
		"Liferay.Object.Admin.REST.everything"
	)

	local object_scopes

	object_scopes=$(python3 -c "
import json

scopes = set()

for path in (
	'${BATCH_DIR}/03-object-definition.batch-engine-data.json',
	'${BATCH_DIR}/05-object-definition-account-entry-restricted.batch-engine-data.json',
):
	try:
		items = json.load(open(path)).get('items', [])
	except FileNotFoundError:
		continue

	for item in items:
		name = item.get('name')

		if name:
			scopes.add('c_' + name.lower() + '.everything')

for scope in sorted(scopes):
	print(scope)
")

	echo "${scopes[*]} ${object_scopes}" | tr '\n' ' '
}

function _read_property {
	local key=${1}
	local file=${2}

	if [[ -f ${file} ]]
	then
		grep "^${key}=" "${file}" | cut -d= -f2- | tr -d "[:space:]"
	fi
}

# Refuses to seed anything but a local or private instance unless
# LIFERAY_SEED_REMOTE is true. The seed creates persona users whose password is
# "test", several of them with administrator roles, so a .env that points
# LIFERAY_URL at a shared environment must not seed it by accident. Loopback,
# *.localhost, and private and tailnet IPv4 addresses (a worktree stack on the
# NUC) count as local.

function _require_local_seed_target {
	local host="${LIFERAY_URL#*://}"

	host="${host%%[:/]*}"

	if [[ ${LIFERAY_SEED_REMOTE:-} == "true" ]] ||
	   [[ ${host} == "localhost" ]] ||
	   [[ ${host} == *".localhost" ]] ||
	   [[ ${host} =~ ^127\. ]] ||
	   [[ ${host} =~ ^10\. ]] ||
	   [[ ${host} =~ ^192\.168\. ]] ||
	   [[ ${host} =~ ^172\.(1[6-9]|2[0-9]|3[01])\. ]] ||
	   [[ ${host} =~ ^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\. ]]
	then
		return 0
	fi

	_warn "Refusing to seed ${LIFERAY_URL}, which is not a local instance."
	_warn "The seed creates persona users whose password is \"test\". Set LIFERAY_SEED_REMOTE=true to seed it anyway."

	exit 1
}

function _run_exit_commands {
	local exit_command

	for exit_command in ${_EXIT_COMMANDS[@]+"${_EXIT_COMMANDS[@]}"}
	do
		"${exit_command}" || true
	done
}

function _unlock_batch_import {
	if [ "${LIFERAY_BATCH_IMPORT_LOCK:-false}" == "true" ]
	then
		_unlock
	fi
}

function _warn {
	echo "${@}" >&2
}

# Minting is left to the sourcing script: the seed scripts call
# _acquire_oauth_token as the first statement of main, and the teardown common
# calls it at source time. _common.sh itself does not mint, so bootstrap.sh can
# source it for get_gradle_property alone without triggering a token request.

_OAUTH_TOKEN=""