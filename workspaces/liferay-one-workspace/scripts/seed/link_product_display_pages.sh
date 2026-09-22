#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# A product renders through the display page template that the commerce channel
# maps to it, and that mapping lives in CPDisplayLayout, keyed by the template
# UUID. The site initializer cannot express it: it has no support for
# CPDisplayLayout, and the UUID does not exist until the template is imported,
# so nothing in the bundle can reference it. Only the channel wide default is
# declarative, through commerce-channel.default-cp-display-layout.json, and that
# one accepts a layout rather than a display page template.
#
# The mapping is therefore established here, after the templates and the
# products exist, by resolving each template UUID from its name and posting the
# override to the channel. Products left out fall back to the template marked as
# the default for commerce products, which is App Detail.
#
# Each entry below is "templateName|productERC". Keep sorted.

PRODUCT_DISPLAY_PAGES=(
	"AI Hub Product Details|PRDCT-AI-HUB"
	"CMP Product Details|PRDCT-CONTENT-MARKETING"
	"DSR Product Details|PRDCT-DSR"
	"DXP Free Tier Product Details|PRDCT-DXP"
	"LDP Product Details|PRDCT-DATA-PLATFORM"
	"SEO Studio|PRDCT-SEO"
)

CHANNEL_EXTERNAL_REFERENCE_CODE="LIFERAY_ONE_CHANNEL"

function main {
	_acquire_oauth_token

	local channel_id

	channel_id=$(_fetch_channel_id)

	if [[ -z ${channel_id} ]]
	then
		echo "Unable to resolve channel ${CHANNEL_EXTERNAL_REFERENCE_CODE}." >&2

		return 1
	fi

	local site_group_id

	site_group_id=$(_fetch_site_group_id "${channel_id}")

	if [[ -z ${site_group_id} ]]
	then
		echo "Unable to resolve the site group of channel ${CHANNEL_EXTERNAL_REFERENCE_CODE}." >&2

		return 1
	fi

	# One listing serves every entry below, so the templates are read once.

	local templates_json

	templates_json=$(_fetch_layout_page_template_entries "${site_group_id}")

	local existing_json

	existing_json=$(_fetch_product_display_pages "${channel_id}")

	local failed=0
	local product_display_page

	for product_display_page in "${PRODUCT_DISPLAY_PAGES[@]}"
	do
		if ! _link_product_display_page \
			"${channel_id}" \
			"${product_display_page%%|*}" \
			"${product_display_page##*|}" \
			"${templates_json}" \
			"${existing_json}"
		then
			failed=1
		fi
	done

	return ${failed}
}

function _fetch_channel_id {
	local url="${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels/by-externalReferenceCode/${CHANNEL_EXTERNAL_REFERENCE_CODE}"

	local attempt

	for ((attempt = 1; attempt <= 60; attempt++))
	do
		local channel_id

		channel_id=$(_curl "${url}" | _read_field "id" || true)

		if [[ -n ${channel_id} ]] && [[ ${channel_id} != "0" ]]
		then
			echo "${channel_id}"

			return 0
		fi

		sleep 5
	done

	return 1
}

function _fetch_layout_page_template_entries {
	local site_group_id="${1}"

	# The display page templates are not exposed through a headless endpoint, so
	# the JSON web service of the layout module is the only way to read a UUID.

	_curl "${LIFERAY_URL}/api/jsonws/layout.layoutpagetemplateentry/get-layout-page-template-entries/group-id/${site_group_id}/status/0" || echo "[]"
}

function _fetch_product_display_pages {
	local channel_id="${1}"

	_curl "${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels/${channel_id}/product-display-pages?pageSize=-1" || echo "{}"
}

function _fetch_site_group_id {
	local channel_id="${1}"

	_curl "${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels/${channel_id}" | _read_field "siteGroupId"
}

function _link_product_display_page {
	local channel_id="${1}"
	local template_name="${2}"
	local product_external_reference_code="${3}"
	local templates_json="${4}"
	local existing_json="${5}"

	local page_template_uuid

	page_template_uuid=$(_read_template_uuid "${template_name}" <<< "${templates_json}")

	if [[ -z ${page_template_uuid} ]]
	then
		echo "Unable to resolve the display page template ${template_name}." >&2

		return 1
	fi

	# Posting an override for a versionable product copies it into a new
	# version, so an entry that already points at the right template is left
	# alone to keep repeated runs from stacking versions.

	if _has_product_display_page \
		"${page_template_uuid}" \
		"${product_external_reference_code}" \
		<<< "${existing_json}"
	then
		echo "Product ${product_external_reference_code} already displays through ${template_name}."

		return 0
	fi

	local status

	status=$(_curl \
		--data "{\"pageTemplateUuid\": \"${page_template_uuid}\", \"productExternalReferenceCode\": \"${product_external_reference_code}\"}" \
		--header "Content-Type: application/json" \
		--output /dev/null \
		--request POST \
		--write-out "%{http_code}" \
		"${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels/${channel_id}/product-display-pages" || true)

	if [[ ${status} == 2* ]]
	then
		echo "Linked product ${product_external_reference_code} to ${template_name}."

		return 0
	fi

	echo "Unable to link product ${product_external_reference_code} to ${template_name}, received ${status}." >&2

	return 1
}

function _has_product_display_page {
	local page_template_uuid="${1}"
	local product_external_reference_code="${2}"

	python3 -c "
import json
import sys

try:
	items = json.load(sys.stdin).get('items', [])
except Exception:
	sys.exit(1)

for item in items:
	if ((item.get('pageTemplateUuid') == '${page_template_uuid}') and
		(item.get('productExternalReferenceCode') == '${product_external_reference_code}')):

		sys.exit(0)

sys.exit(1)
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

function _read_template_uuid {
	local name="${1}"

	python3 -c "
import json
import sys

try:
	layout_page_template_entries = json.load(sys.stdin)
except Exception:
	print('')

	sys.exit()

for layout_page_template_entry in layout_page_template_entries:
	if layout_page_template_entry.get('name') == '''${name}''':
		print(layout_page_template_entry.get('uuid', ''))

		sys.exit()

print('')
"
}

main "${@}"