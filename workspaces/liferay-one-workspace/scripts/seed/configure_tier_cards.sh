#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

# A tier card prices and sells one SKU, and its configuration names that SKU by
# the numeric product and SKU IDs the delivery catalog API expects. Those IDs
# are assigned when the products are created, so they differ per environment
# and per reset, and the site initializer has no placeholder for them: it only
# resolves CP_DEFINITION_ID, and only for products it imports itself.
#
# The IDs are therefore written here, after the display page templates and the
# products exist, together with the button link, which carries the product ID
# into the purchase flow. Each card is found by the page element ID it carries
# in the page definition, which is stable, and both the published and the draft
# versions of the template are updated so that publishing the draft from the
# editor does not bring back empty IDs.
#
# seed.sh seeds local test data, so UAT and prod never run this step through it,
# and their tier cards keep the empty IDs the page definition ships with. Run it
# against each of them on its own after the site initializer, with that
# environment's LIFERAY_URL and admin credentials:
#
# LIFERAY_ADMIN_EMAIL=... LIFERAY_ADMIN_PASSWORD=... LIFERAY_URL=... \
# scripts/seed/configure_tier_cards.sh
#
# Each entry below is "templateName|pageElementId|productERC|skuERC". Keep
# sorted.

TIER_CARDS=(
	"AI Hub Product Details|05d883b0-fe63-9f35-dadb-2b1c802b1dad|PRDCT-AI-HUB|PRDCT-AI-HUB-STUDIO"
	"AI Hub Product Details|2d82c0f9-f8e5-85d6-3dbf-518692f9c95a|PRDCT-AI-HUB|PRDCT-AI-HUB-ACTIVATE"
)

CHANNEL_EXTERNAL_REFERENCE_CODE="LIFERAY_ONE_CHANNEL"

FREEMARKER_FRAGMENT_ENTRY_PROCESSOR="com.liferay.fragment.entry.processor.freemarker.FreeMarkerFragmentEntryProcessor"

SITE_EXTERNAL_REFERENCE_CODE="LIFERAY_ONE"

function main {

	# The fragment entry links are read and written through the JSON web
	# service, which the OAuth2 token scopes do not cover, so the whole run uses
	# the admin credentials, as link_product_display_pages.sh does.

	export LIFERAY_AUTH_MODE=basic

	local site_group_id

	site_group_id=$(_fetch_site_group_id)

	if [[ -z ${site_group_id} ]]
	then
		echo "Unable to resolve the site group of channel ${CHANNEL_EXTERNAL_REFERENCE_CODE}." >&2

		return 1
	fi

	# One listing serves every entry below, so the templates are read once.

	local templates_json

	templates_json=$(_fetch_display_page_templates)

	local failed=0
	local tier_card

	for tier_card in "${TIER_CARDS[@]}"
	do
		local template_name
		local page_element_id
		local product_external_reference_code
		local sku_external_reference_code

		IFS="|" read -r \
			template_name \
			page_element_id \
			product_external_reference_code \
			sku_external_reference_code \
			<<< "${tier_card}"

		if ! _configure_tier_card \
			"${page_element_id}" \
			"${product_external_reference_code}" \
			"${site_group_id}" \
			"${sku_external_reference_code}" \
			"${template_name}" \
			"${templates_json}"
		then
			failed=1
		fi
	done

	return ${failed}
}

function _configure_tier_card {
	local page_element_id="${1}"
	local product_external_reference_code="${2}"
	local site_group_id="${3}"
	local sku_external_reference_code="${4}"
	local template_name="${5}"
	local templates_json="${6}"

	local template_external_reference_code

	template_external_reference_code=$(_read_template_external_reference_code "${template_name}" <<< "${templates_json}")

	if [[ -z ${template_external_reference_code} ]]
	then
		echo "Unable to resolve the display page template ${template_name}." >&2

		return 1
	fi

	local ids

	ids=$(_fetch_product_and_sku_ids "${product_external_reference_code}" "${sku_external_reference_code}")

	if [[ -z ${ids} ]]
	then
		echo "Unable to resolve the IDs of SKU ${sku_external_reference_code} in product ${product_external_reference_code}." >&2

		return 1
	fi

	local product_id="${ids%% *}"
	local sku_id="${ids##* }"

	local fragment_entry_link_external_reference_codes

	fragment_entry_link_external_reference_codes=$(_fetch_page_specifications "${template_external_reference_code}" | _read_fragment_entry_link_external_reference_codes "${page_element_id}")

	if [[ -z ${fragment_entry_link_external_reference_codes} ]]
	then
		echo "Unable to find the tier card ID ${page_element_id} in ${template_name}." >&2

		return 1
	fi

	# _update_fragment_entry_link sets updated when it writes, so a repeated run
	# reports the cards it left alone instead of claiming to configure them.

	local failed=0
	local fragment_entry_link_external_reference_code
	local updated=0

	for fragment_entry_link_external_reference_code in ${fragment_entry_link_external_reference_codes}
	do
		if ! _update_fragment_entry_link \
			"${fragment_entry_link_external_reference_code}" \
			"${product_id}" \
			"${site_group_id}" \
			"${sku_id}"
		then
			failed=1
		fi
	done

	if ((failed == 0)) && ((updated == 1))
	then
		echo "Configured the tier card ID ${page_element_id} of ${template_name} with SKU ${sku_external_reference_code}."
	elif ((failed == 0))
	then
		echo "The tier card ID ${page_element_id} of ${template_name} already sells SKU ${sku_external_reference_code}."
	fi

	return ${failed}
}

function _fetch_display_page_templates {
	_curl "${LIFERAY_URL}/o/headless-admin-site/v1.0/sites/${SITE_EXTERNAL_REFERENCE_CODE}/display-page-templates?pageSize=-1" || echo "{}"
}

function _fetch_page_specifications {
	local template_external_reference_code="${1}"

	_curl "${LIFERAY_URL}/o/headless-admin-site/v1.0/sites/${SITE_EXTERNAL_REFERENCE_CODE}/display-page-templates/${template_external_reference_code}/page-specifications" || echo "{}"
}

# Prints "productId skuId". The product ID is the cProductId, which is what the
# delivery catalog API takes as the product ID, and the SKU ID is the CPInstance
# ID, which is what it returns as the SKU ID.

function _fetch_product_and_sku_ids {
	local product_external_reference_code="${1}"
	local sku_external_reference_code="${2}"

	_curl "${LIFERAY_URL}/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/${product_external_reference_code}?nestedFields=skus" | python3 -c "
import json
import sys

try:
	product = json.load(sys.stdin)
except Exception:
	sys.exit()

for sku in product.get('skus') or []:
	if sku.get('externalReferenceCode') == sys.argv[1]:
		print(product['productId'], sku['id'])

		sys.exit()
" "${sku_external_reference_code}"
}

function _fetch_site_group_id {
	_curl "${LIFERAY_URL}/o/headless-commerce-admin-channel/v1.0/channels/by-externalReferenceCode/${CHANNEL_EXTERNAL_REFERENCE_CODE}" | _read_field "siteGroupId"
}

# Prints one fragment entry link ERC per page specification of the template,
# that is, one for the published version and one for the draft. The page
# element ID is kept from the page definition, but the fragment entry link
# behind it gets a new ERC in every environment and in every version.

function _read_fragment_entry_link_external_reference_codes {
	local page_element_id="${1}"

	python3 -c "
import json
import sys

try:
	page_specifications = json.load(sys.stdin).get('items', [])
except Exception:
	sys.exit()

def find(value):
	if isinstance(value, dict):
		if value.get('externalReferenceCode') == sys.argv[1]:
			yield value

		for child in value.values():
			yield from find(child)
	elif isinstance(value, list):
		for child in value:
			yield from find(child)

for page_specification in page_specifications:
	for page_element in find(page_specification):
		fragment_instance = page_element.get('pageElementDefinition', {}).get('fragmentInstance', {})

		if fragment_instance.get('fragmentInstanceExternalReferenceCode'):
			print(fragment_instance['fragmentInstanceExternalReferenceCode'])
" "${page_element_id}"
}

function _read_field {
	local field="${1}"

	python3 -c "
import json
import sys

try:
	print(json.load(sys.stdin).get(sys.argv[1], ''))
except Exception:
	print('')
" "${field}"
}

function _read_template_external_reference_code {
	local name="${1}"

	python3 -c "
import json
import sys

try:
	display_page_templates = json.load(sys.stdin).get('items', [])
except Exception:
	display_page_templates = []

for display_page_template in display_page_templates:
	if display_page_template.get('name') == sys.argv[1]:
		print(display_page_template.get('externalReferenceCode', ''))

		sys.exit()

print('')
" "${name}"
}

function _update_fragment_entry_link {
	local fragment_entry_link_external_reference_code="${1}"
	local product_id="${2}"
	local site_group_id="${3}"
	local sku_id="${4}"

	local fragment_entry_link_json

	fragment_entry_link_json=$(_curl \
		--data-urlencode "externalReferenceCode=${fragment_entry_link_external_reference_code}" \
		--data-urlencode "groupId=${site_group_id}" \
		--get \
		"${LIFERAY_URL}/api/jsonws/fragment.fragmententrylink/get-fragment-entry-link-by-external-reference-code" || true)

	# Only the button link and the two IDs change. Every other configuration
	# value, and the editable values of the other processors, are written back
	# as they were read.

	local update

	update=$(python3 -c "
import json
import sys

try:
	fragment_entry_link = json.loads(sys.argv[1])
	editable_values = json.loads(fragment_entry_link['editableValues'])
except Exception:
	sys.exit()

button_link = '/product-purchase?productId=' + sys.argv[3]

configuration = editable_values.setdefault(sys.argv[2], {})

if ((configuration.get('buttonLink') == button_link) and
	(configuration.get('productId') == sys.argv[3]) and
	(configuration.get('skuId') == sys.argv[4])):

	print(fragment_entry_link['fragmentEntryLinkId'], 'unchanged')

	sys.exit()

configuration['buttonLink'] = button_link
configuration['productId'] = sys.argv[3]
configuration['skuId'] = sys.argv[4]

print(fragment_entry_link['fragmentEntryLinkId'], json.dumps(editable_values))
" "${fragment_entry_link_json}" "${FREEMARKER_FRAGMENT_ENTRY_PROCESSOR}" "${product_id}" "${sku_id}")

	if [[ -z ${update} ]]
	then
		echo "Unable to read the fragment entry link ${fragment_entry_link_external_reference_code}." >&2

		return 1
	fi

	local fragment_entry_link_id="${update%% *}"
	local editable_values="${update#* }"

	if [[ ${editable_values} == "unchanged" ]]
	then
		return 0
	fi

	local response

	response=$(_curl \
		--data-urlencode "editableValues=${editable_values}" \
		--data-urlencode "fragmentEntryLinkId=${fragment_entry_link_id}" \
		"${LIFERAY_URL}/api/jsonws/fragment.fragmententrylink/update-fragment-entry-link" || true)

	if [[ $(_read_field "fragmentEntryLinkId" <<< "${response}") == "${fragment_entry_link_id}" ]]
	then
		updated=1

		return 0
	fi

	echo "Unable to update the fragment entry link ${fragment_entry_link_external_reference_code}, received ${response}." >&2

	return 1
}

main "${@}"