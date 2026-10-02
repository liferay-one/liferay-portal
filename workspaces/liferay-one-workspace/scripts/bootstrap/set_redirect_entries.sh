#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# Force admin basic auth before sourcing the common helpers. Managing redirect
# entries is a JSONWS admin operation: JSONWS does not accept the seed's scoped
# OAuth token, and the seed scope list does not include the site API used to
# resolve the group ID, so the OAuth path would fail on both calls.

export LIFERAY_AUTH_MODE=basic

source ../_common.sh

# Register the site redirects that give the custom element's hash routes a
# plain path. The custom element runs under a HashRouter inside a single
# layout, so a section such as activation is only reachable at
# http://one.localhost/my-account/#/activation. A path a person can type or
# paste, http://one.localhost/my-account/activation, has no layout behind it
# and the portal answers 404 before any of the element's redirect routes run.
#
# The Redirection app covers exactly this: FriendlyURLServlet consults
# RedirectProvider before it resolves a layout, so an entry matches even though
# no page exists at the source path. A page is deliberately not created for
# this -- a second layout would load a second copy of the element rather than
# redirect into the one that is already routing.
#
# This lives here rather than in the site initializer because neither half of
# the Redirection app can be expressed there. BundleSiteInitializer has no
# redirect resource, so the entries below have no declarative form. Its one
# generic escape hatch, site-settings.json, writes group scoped OSGi
# configuration and would otherwise reach the app's other half,
# RedirectPatternConfiguration -- but it passes every property value as a
# string, and RedirectPatternConfigurationModelListener.onBeforeSave casts
# patternStrings straight to String[]. The save throws a ClassCastException
# before the configuration is ever stored, which in a site initializer run
# fails the whole provision. A .config file under configs/ does carry a real
# String[], but the configuration is group scoped and strictly so, and a file
# cannot know the group ID the site initializer is about to mint.
#
# So the redirects are applied here as a bootstrap step that runs after the
# site initializer has created the site, the same way the virtual host binding
# is, and for the same reason: the site's group ID only exists once the site
# does. Each entry is looked up before it is written, so re-running on every
# bootstrap and env reset re-asserts the same destination rather than failing
# on a duplicate.
#
# Each entry below is "siteExternalReferenceCode sourceURL destinationURL". The
# source URL is site relative and carries no leading slash, which is what
# RedirectEntry stores and what FriendlyURLServlet normalizes an incoming
# request to. Keep sorted.

REDIRECT_ENTRIES=(
	"LIFERAY_ONE my-account/activation /my-account/#/activation"
)

function main {
	_acquire_oauth_token

	local redirect_entry

	for redirect_entry in "${REDIRECT_ENTRIES[@]}"
	do
		_set_redirect_entry ${redirect_entry}
	done
}

function _read_group_id {
	local external_reference_code="${1}"

	python3 -c "
import json
import sys

try:
	items = json.load(sys.stdin).get('items', [])
except Exception:
	items = []

for item in items:
	if item.get('externalReferenceCode') == '${external_reference_code}':
		print(item.get('id', ''))

		break
else:
	print('')
"
}

# Prints the redirect entry ID and destination URL already registered for a
# source URL, separated by a tab, or nothing when the source URL is new.

function _read_redirect_entry {
	local source_url="${1}"

	python3 -c "
import json
import sys

try:
	items = json.load(sys.stdin)
except Exception:
	items = []

if not isinstance(items, list):
	items = []

for item in items:
	if item.get('sourceURL') == '${source_url}':
		print('%s\t%s' % (item.get('redirectEntryId', ''), item.get('destinationURL', '')))

		break
else:
	print('')
"
}

function _set_redirect_entry {
	local site_external_reference_code="${1}"
	local source_url="${2}"
	local destination_url="${3}"

	# The sites list is filtered by external reference code rather than fetched
	# through the by-external-reference-code path because that path (and the
	# by-id path) return 404 for site groups on this release; the list endpoint
	# resolves them reliably.

	local sites_url="${LIFERAY_URL}/o/headless-admin-site/v1.0/sites?pageSize=200"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		# Wait for the site initializer to create the site.

		local group_id

		group_id=$(_curl "${sites_url}" | _read_group_id "${site_external_reference_code}" || true)

		if [[ -z ${group_id} ]] || [[ ${group_id} == "0" ]]
		then
			sleep 5

			continue
		fi

		# RedirectEntryService.getRedirectEntries takes the group ID, a start
		# and end bound, and an order by comparator. The bounds are the
		# QueryUtil.ALL_POS sentinel so every entry comes back, since the site
		# holds only a handful. They cannot be nulled through the JSONWS "-"
		# prefix the way the comparator is -- nulling a primitive int leaves
		# JSONWS unable to match the method, and it answers an empty object
		# rather than the list.

		local redirect_entry

		redirect_entry=$(_curl \
			--get \
			--data-urlencode "groupId=${group_id}" \
			--data-urlencode "end=-1" \
			--data-urlencode "start=-1" \
			--data-urlencode "-orderByComparator=" \
			"${LIFERAY_URL}/api/jsonws/redirect.redirectentry/get-redirect-entries" |
			_read_redirect_entry "${source_url}" || true)

		local redirect_entry_id
		local registered_destination_url

		redirect_entry_id=$(cut --fields 1 <<< "${redirect_entry}")
		registered_destination_url=$(cut --fields 2 <<< "${redirect_entry}")

		if [[ ${registered_destination_url} == "${destination_url}" ]]
		then
			echo "Redirect from ${source_url} to ${destination_url} is already registered on site ${site_external_reference_code}."

			return 0
		fi

		# RedirectEntryService.addRedirectEntry and updateRedirectEntry both
		# take the destination URL, an expiration date, a permanent flag and
		# the source URL. The expiration date is nulled so the redirect never
		# lapses, and the redirect is temporary rather than permanent so a
		# browser that followed it once still asks the server again after the
		# hash route moves.

		local status

		if [[ -n ${redirect_entry_id} ]]
		then
			status=$(_curl \
				--data-urlencode "destinationURL=${destination_url}" \
				--data-urlencode "-expirationDate=" \
				--data-urlencode "permanent=false" \
				--data-urlencode "redirectEntryId=${redirect_entry_id}" \
				--data-urlencode "sourceURL=${source_url}" \
				--output /dev/null \
				--request POST \
				--write-out "%{http_code}" \
				"${LIFERAY_URL}/api/jsonws/redirect.redirectentry/update-redirect-entry" || true)
		else
			status=$(_curl \
				--data-urlencode "destinationURL=${destination_url}" \
				--data-urlencode "-expirationDate=" \
				--data-urlencode "groupId=${group_id}" \
				--data-urlencode "permanent=false" \
				--data-urlencode "sourceURL=${source_url}" \
				--output /dev/null \
				--request POST \
				--write-out "%{http_code}" \
				"${LIFERAY_URL}/api/jsonws/redirect.redirectentry/add-redirect-entry" || true)
		fi

		if [[ ${status} == 2* ]]
		then
			echo "Registered redirect from ${source_url} to ${destination_url} on site ${site_external_reference_code}."

			return 0
		fi

		sleep 3
	done

	echo "Unable to register redirect from ${source_url} to ${destination_url} on site ${site_external_reference_code}." >&2

	return 1
}

main "${@}"