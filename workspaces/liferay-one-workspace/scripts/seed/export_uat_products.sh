#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

# The seed products are copies of real UAT products, never products of their
# own. This script reads the products that uat_products.json allows from UAT and
# writes them to the seed, so that the local catalog holds what UAT holds:
#
# data/05-commerce-option.batch-engine-data.json
# data/06-commerce-product.batch-engine-data.json
# ../../client-extensions/liferay-one-salesforce-product-batch/batch/00-commerce-option.batch-engine-data.json
# ../../client-extensions/liferay-one-salesforce-product-batch/batch/02-commerce-product.batch-engine-data.json
#
# It only reads from UAT. The overlay in uat_products.json adds what UAT still
# lacks, and each overlay entry says which UAT change makes it unnecessary.
#
# Run it with the UAT OAuth2 client in the workspace .env:
#
# LIFERAY_URL=https://one-uat.liferay.com ./export_uat_products.sh

export LIFERAY_URL="${LIFERAY_URL:-https://one-uat.liferay.com}"

export LIFERAY_OAUTH_TOKEN_URL="${LIFERAY_URL}/o/oauth2/token"

export LIFERAY_AUTH_MODE="oauth"

export LIFERAY_OAUTH_SCOPE="Liferay.Headless.Commerce.Admin.Catalog.everything Liferay.Headless.Delivery.everything"

source ../_common.sh

unset LIFERAY_OAUTH_TOKEN

function main {
	_acquire_oauth_token

	_OAUTH_TOKEN="${_OAUTH_TOKEN}" ./export_uat_products.py
}

main "${@}"