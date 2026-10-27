#!/usr/bin/env python3

import json
import os
import re
import sys
import urllib.parse
import urllib.request

SEED_DIR = os.path.dirname(os.path.abspath(__file__))

DATA = os.path.join(SEED_DIR, "data")

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(SEED_DIR))

BATCH = os.path.join(
	WORKSPACE_ROOT, "client-extensions", "liferay-one-batch", "batch"
)

SALESFORCE_BATCH = os.path.join(
	WORKSPACE_ROOT,
	"client-extensions",
	"liferay-one-salesforce-product-batch",
	"batch",
)

CATALOG_API = "/o/headless-commerce-admin-catalog/v1.0"

DELIVERY_API = "/o/headless-delivery/v1.0"

# The migrated Marketplace products spell these two specifications in the
# singular. The Salesforce products on UAT took the plural from an earlier seed.
# One spelling serves both.

SPECIFICATION_KEYS = {
	"liferay-products-capabilities": "liferay-product-capabilities",
	"liferay-products-categories": "liferay-product-categories",
}


def configuration(class_name):
	return {
		"className": "com.liferay.headless.commerce.admin.catalog.dto.v1_0."
		+ class_name,
		"parameters": {
			"containsHeaders": "true",
			"createStrategy": "UPSERT",
			"onErrorFail": "false",
			"taskItemDelegateName": "DEFAULT",
			"updateStrategy": "PARTIAL_UPDATE",
		},
	}


def fetch_image(product_id):
	images = sorted(
		get_items("/products/%d/images" % product_id),
		key=lambda image: image.get("priority", 0),
	)

	if not images:
		return None

	image = images[0]

	document = get(
		"/documents/%d" % image["fileEntryId"],
		api=DELIVERY_API,
		fields="contentValue,encodingFormat",
		nestedFields="contentValue",
	)

	return {
		"attachment": document["contentValue"],
		"contentType": document["encodingFormat"],
		"neverExpire": True,
		"priority": 0,
		"tags": image.get("tags") or [],
		"title": localized(image.get("title")),
	}


def fetch_product(external_reference_code):
	product = get(
		"/products/by-externalReferenceCode/"
		+ urllib.parse.quote(external_reference_code),
		**{
			"categories.pageSize": "-1",
			"nestedFields": "categories,productOptions,productSpecifications,skus",
			"productOptions.pageSize": "-1",
			"productSpecifications.pageSize": "-1",
			"skus.pageSize": "-1",
		},
	)

	for product_option in product.get("productOptions") or []:
		product_option["productOptionValues"] = get_items(
			"/productOptions/%d/productOptionValues" % product_option["id"]
		)

	return product


def get(path, api=CATALOG_API, **parameters):
	url = os.environ["LIFERAY_URL"] + api + path

	if parameters:
		url += "?" + urllib.parse.urlencode(parameters)

	request = urllib.request.Request(
		url,
		headers={
			"Accept": "application/json",
			"Authorization": "Bearer " + os.environ["_OAUTH_TOKEN"],
		},
	)

	with urllib.request.urlopen(request) as response:
		return json.load(response)


def get_items(path, **parameters):
	items = []

	page = 1

	while True:
		response = get(path, page=page, pageSize=200, **parameters)

		items.extend(response.get("items", []))

		if page >= response.get("lastPage", 1):
			return items

		page += 1


def load(path):
	with open(path, encoding="utf-8") as file:
		return json.load(file)


def localized(value):
	return {"en_US": (value or {}).get("en_US", "")}


def main():
	config = load(os.path.join(SEED_DIR, "uat_products.json"))

	overlays = {
		overlay["externalReferenceCode"]: overlay
		for overlay in config["overlay"]
	}

	stale_overlays = []

	seed_products = [
		to_product(
			fetch_product(product["externalReferenceCode"]),
			overlays,
			stale_overlays,
			seed=True,
		)
		for product in config["products"]
	]

	salesforce_products = [
		to_product(
			fetch_product(product["externalReferenceCode"]),
			overlays,
			stale_overlays,
			seed=False,
		)
		for product in get_items("/products", fields="externalReferenceCode")
		if product["externalReferenceCode"].startswith("salesforce-product-")
	]

	salesforce_products.sort(key=lambda product: product["externalReferenceCode"])

	missing_overlays = (
		set(overlays)
		- {product["externalReferenceCode"] for product in seed_products}
		- {product["externalReferenceCode"] for product in salesforce_products}
	)

	if missing_overlays:
		print(
			"Unable to apply the overlay for " + ", ".join(sorted(missing_overlays)),
			file=sys.stderr,
		)

		return 1

	batch_options = {
		option["externalReferenceCode"]
		for option in load(
			os.path.join(BATCH, "09-commerce-option.batch-engine-data.json")
		)["items"]
	}

	write(
		os.path.join(DATA, "05-commerce-catalog.batch-engine-data.json"),
		"Catalog",
		[to_catalog(catalog) for catalog in config["catalogs"]],
	)
	write(
		os.path.join(DATA, "05-commerce-option.batch-engine-data.json"),
		"Option",
		to_options(seed_products, batch_options),
	)
	write(
		os.path.join(DATA, "06-commerce-product.batch-engine-data.json"),
		"Product",
		seed_products,
	)
	write(
		os.path.join(
			SALESFORCE_BATCH, "00-commerce-option.batch-engine-data.json"
		),
		"Option",
		to_options(salesforce_products, batch_options),
	)
	write(
		os.path.join(
			SALESFORCE_BATCH, "02-commerce-product.batch-engine-data.json"
		),
		"Product",
		salesforce_products,
	)

	report_undefined_specifications(seed_products + salesforce_products)

	for stale_overlay in stale_overlays:
		print(
			"UAT already has %s, so remove it from the overlay in "
			"uat_products.json." % stale_overlay,
			file=sys.stderr,
		)

	return 0


def merge_overlay(product, overlay, stale_overlays):
	external_reference_code = product["externalReferenceCode"]

	option_keys = {
		product_option["key"] for product_option in product["productOptions"]
	}

	for product_option in overlay.get("productOptions", []):
		if product_option["key"] in option_keys:
			stale_overlays.append(
				"the %s option of %s"
				% (product_option["key"], external_reference_code)
			)
		else:
			product["productOptions"].append(product_option)

	specification_keys = {
		specification["specificationKey"]
		for specification in product["productSpecifications"]
	}

	for specification in overlay.get("productSpecifications", []):
		if specification["specificationKey"] in specification_keys:
			stale_overlays.append(
				"the %s specification of %s"
				% (specification["specificationKey"], external_reference_code)
			)
		else:
			product["productSpecifications"].append(specification)

	skus = {sku["externalReferenceCode"]: sku for sku in product["skus"]}

	for overlay_sku in overlay.get("skus", []):
		sku = skus.get(overlay_sku["externalReferenceCode"])

		if sku is None:
			product["skus"].append({"skuOptions": [], **overlay_sku})

			continue

		if not overlay_sku.get("skuOptions"):
			stale_overlays.append(
				"the %s SKU of %s"
				% (overlay_sku["externalReferenceCode"], external_reference_code)
			)

			continue

		sku_option_keys = {sku_option["key"] for sku_option in sku["skuOptions"]}

		for sku_option in overlay_sku["skuOptions"]:
			if sku_option["key"] in sku_option_keys:
				stale_overlays.append(
					"the %s option of the %s SKU of %s"
					% (
						sku_option["key"],
						overlay_sku["externalReferenceCode"],
						external_reference_code,
					)
				)
			else:
				sku["skuOptions"].append(sku_option)


def report_undefined_specifications(products):
	defined = {
		specification["key"]
		for path in (
			os.path.join(BATCH, "10-commerce-specification.batch-engine-data.json"),
			os.path.join(
				SALESFORCE_BATCH,
				"01-commerce-specification.batch-engine-data.json",
			),
		)
		for specification in load(path)["items"]
	}

	undefined = {}

	for product in products:
		for specification in product["productSpecifications"]:
			if specification["specificationKey"] not in defined:
				undefined.setdefault(specification["specificationKey"], []).append(
					product["externalReferenceCode"]
				)

	for key, external_reference_codes in sorted(undefined.items()):
		print(
			"The specification %s is not defined locally, so the import drops it "
			"from %s." % (key, ", ".join(sorted(set(external_reference_codes)))),
			file=sys.stderr,
		)


def sort_key(specification):
	return (specification["specificationKey"], specification["value"]["en_US"])


def to_catalog(catalog):
	uat_catalog = get(
		"/catalog/by-externalReferenceCode/"
		+ urllib.parse.quote(catalog["externalReferenceCode"])
	)

	return {
		"currencyCode": uat_catalog["currencyCode"],
		"externalReferenceCode": uat_catalog["externalReferenceCode"],
		"name": uat_catalog["name"],
	}


def to_number(value):
	if isinstance(value, float) and value.is_integer():
		return int(value)

	return value


def to_options(products, batch_options):
	external_reference_codes = sorted(
		{
			product_option["optionExternalReferenceCode"]
			for product in products
			for product_option in product["productOptions"]
		}
		- batch_options
	)

	options = []

	for external_reference_code in external_reference_codes:
		option = get(
			"/options/by-externalReferenceCode/"
			+ urllib.parse.quote(external_reference_code)
		)

		options.append(
			{
				"externalReferenceCode": option["externalReferenceCode"],
				"facetable": option.get("facetable", False),
				"fieldType": option["fieldType"],
				"key": option["key"],
				"name": localized(option["name"]),
				"optionValues": sorted(
					[
						{
							"externalReferenceCode": option_value[
								"externalReferenceCode"
							],
							"key": option_value["key"],
							"name": localized(option_value["name"]),
							"priority": to_number(option_value.get("priority", 0)),
						}
						for option_value in get_items(
							"/options/%d/optionValues" % option["id"]
						)
					],
					key=lambda option_value: option_value["key"],
				),
				"required": option.get("required", False),
				"skuContributor": option.get("skuContributor", False),
			}
		)

	return options


def to_product(uat_product, overlays, stale_overlays, seed):
	external_reference_code = uat_product["externalReferenceCode"]

	product = {
		"active": uat_product["active"],
		"catalogExternalReferenceCode": uat_product["catalogExternalReferenceCode"],
		"externalReferenceCode": external_reference_code,
		"name": localized(uat_product["name"]),
		"productOptions": [
			{
				"facetable": product_option.get("facetable", False),
				"fieldType": product_option["fieldType"],
				"key": product_option["key"],
				"name": localized(product_option["name"]),
				"optionExternalReferenceCode": product_option[
					"optionExternalReferenceCode"
				],
				"productOptionValues": sorted(
					[
						{
							"key": product_option_value["key"],
							"name": localized(product_option_value["name"]),
							"priority": to_number(
								product_option_value.get("priority", 0)
							),
						}
						for product_option_value in product_option[
							"productOptionValues"
						]
					],
					key=lambda product_option_value: product_option_value["key"],
				),
				"required": product_option.get("required", False),
				"skuContributor": product_option.get("skuContributor", False),
			}
			for product_option in uat_product.get("productOptions") or []
		],
		"productSpecifications": [
			{
				"specificationKey": SPECIFICATION_KEYS.get(
					specification["specificationKey"],
					specification["specificationKey"],
				),
				"value": localized(specification.get("value")),
			}
			for specification in uat_product.get("productSpecifications") or []
		],
		"productType": uat_product["productType"],
		"skus": [
			{
				"externalReferenceCode": sku["externalReferenceCode"],
				"neverExpire": sku.get("neverExpire") is not False,
				"price": to_number(float(sku.get("price") or 0)),
				"published": sku["published"],
				"purchasable": sku["purchasable"],
				"sku": sku["sku"],
				"skuOptions": [
					{"key": sku_option["key"], "value": sku_option["value"]}
					for sku_option in sku.get("skuOptions") or []
				],
			}
			for sku in uat_product.get("skus") or []
		],
	}

	description = (uat_product.get("description") or {}).get("en_US")

	if description:
		product["description"] = {"en_US": description}

	if seed:
		product["categories"] = sorted(
			[
				{"externalReferenceCode": category["externalReferenceCode"]}
				for category in uat_product.get("categories") or []
			],
			key=lambda category: category["externalReferenceCode"],
		)

		image = fetch_image(uat_product["productId"])

		if image:
			product["images"] = [image]

		short_description = (uat_product.get("shortDescription") or {}).get(
			"en_US"
		)

		if short_description:
			product["shortDescription"] = {"en_US": short_description}

		friendly_url = (uat_product.get("urls") or {}).get("en_US")

		if friendly_url:
			product["urls"] = {"en_US": urllib.parse.unquote(friendly_url)}
	else:
		product["productStatus"] = uat_product["productStatus"]

	if external_reference_code in overlays:
		merge_overlay(product, overlays[external_reference_code], stale_overlays)

	product["productSpecifications"].sort(key=sort_key)

	for sku in product["skus"]:
		sku["skuOptions"].sort(key=lambda sku_option: sku_option["key"])

	product["skus"].sort(key=lambda sku: sku["externalReferenceCode"])

	return dict(sorted(product.items()))


def write(path, class_name, items):
	if os.path.exists(path):
		file_configuration = load(path)["configuration"]
	else:
		file_configuration = configuration(class_name)

	content = json.dumps(
		{"configuration": file_configuration, "items": items},
		ensure_ascii=False,
		indent="\t",
	)

	with open(path, "w", encoding="utf-8") as file:
		file.write(
			re.sub(
				r"^(\t*)(.*)\[\](,?)$", r"\1\2[\n\1]\3", content, flags=re.M
			)
		)

	print("Wrote %d items to %s." % (len(items), os.path.relpath(path)))


if __name__ == "__main__":
	sys.exit(main())