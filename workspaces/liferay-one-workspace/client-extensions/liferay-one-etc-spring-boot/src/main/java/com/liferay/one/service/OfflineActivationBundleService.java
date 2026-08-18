/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.exception.AddOnsUnavailableException;
import com.liferay.one.model.Environment;
import com.liferay.portal.kernel.util.Validator;

import java.io.InputStream;

import java.net.http.HttpResponse;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class OfflineActivationBundleService {

	public Path createBundle(String dxpVersion, Environment environment)
		throws Exception {

		JSONObject manifestJSONObject =
			_cloudNativeManifestService.getManifestJSONObject(
				dxpVersion, environment);

		Path path = Files.createTempFile("offline-activation-bundle-", ".zip");

		try (ZipOutputStream zipOutputStream = new ZipOutputStream(
				Files.newOutputStream(path))) {

			zipOutputStream.putNextEntry(new ZipEntry("manifest.json"));

			zipOutputStream.write(
				manifestJSONObject.toString(
					2
				).getBytes(
					StandardCharsets.UTF_8
				));

			zipOutputStream.closeEntry();

			JSONArray addOnsJSONArray = manifestJSONObject.optJSONArray(
				"add-ons");

			if (addOnsJSONArray != null) {
				for (int i = 0; i < addOnsJSONArray.length(); i++) {
					_writeAddOn(
						addOnsJSONArray.getJSONObject(i), zipOutputStream);
				}
			}
		}
		catch (Exception exception) {
			Files.deleteIfExists(path);

			throw exception;
		}

		return path;
	}

	private String _getFileName(
		JSONObject addOnJSONObject,
		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry) {

		String src = productVirtualSettingsFileEntry.getSrc();

		if (Validator.isNotNull(src)) {
			String fileName = src.substring(src.lastIndexOf('/') + 1);

			int index = fileName.indexOf('?');

			if (index != -1) {
				fileName = fileName.substring(0, index);
			}

			if (fileName.endsWith(".lpkg")) {
				return fileName;
			}
		}

		return addOnJSONObject.optString("productId") + ".lpkg";
	}

	private void _writeAddOn(
			JSONObject addOnJSONObject, ZipOutputStream zipOutputStream)
		throws Exception {

		String externalReferenceCode = addOnJSONObject.optString("productId");

		Product product = _commerceProductService.fetchProduct(
			externalReferenceCode);

		if (product == null) {
			throw new AddOnsUnavailableException(
				"No product exists for external reference code " +
					externalReferenceCode);
		}

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					product.getProductId(),
					addOnJSONObject.optLong("virtualEntryId"));

		if (productVirtualSettingsFileEntry == null) {
			throw new AddOnsUnavailableException(
				"No package is available for product " + externalReferenceCode);
		}

		HttpResponse<InputStream> httpResponse =
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				productVirtualSettingsFileEntry.getSrc());

		String fileName = _getFileName(
			addOnJSONObject, productVirtualSettingsFileEntry);

		zipOutputStream.putNextEntry(new ZipEntry("add-ons/" + fileName));

		try (InputStream inputStream = httpResponse.body()) {
			inputStream.transferTo(zipOutputStream);
		}

		zipOutputStream.closeEntry();
	}

	@Autowired
	private CloudNativeManifestService _cloudNativeManifestService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;

}