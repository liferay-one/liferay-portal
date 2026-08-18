/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettings;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductVirtualSettingsFileEntryResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductVirtualSettingsResource;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.io.IOException;
import java.io.InputStream;

import java.net.HttpURLConnection;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import java.security.MessageDigest;

import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class CommerceProductVirtualSettingsService extends OneBaseService {

	public ProductVirtualSettingsFileEntry fetchProductVirtualSettingsFileEntry(
			long productId, long productVirtualSettingsFileEntryId)
		throws Exception {

		for (ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry :
				getProductVirtualSettingsFileEntries(productId)) {

			if (Objects.equals(
					productVirtualSettingsFileEntry.getId(),
					productVirtualSettingsFileEntryId)) {

				return productVirtualSettingsFileEntry;
			}
		}

		return null;
	}

	public ProductVirtualSettingsFileEntry fetchProductVirtualSettingsFileEntry(
			long productId, String version)
		throws Exception {

		ProductVirtualSettingsFileEntry latestProductVirtualSettingsFileEntry =
			null;

		for (ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry :
				getProductVirtualSettingsFileEntries(productId)) {

			String curVersion = productVirtualSettingsFileEntry.getVersion();

			if (Validator.isNotNull(version) &&
				Objects.equals(curVersion, version)) {

				return productVirtualSettingsFileEntry;
			}

			if (latestProductVirtualSettingsFileEntry == null) {
				latestProductVirtualSettingsFileEntry =
					productVirtualSettingsFileEntry;

				continue;
			}

			if (Validator.isNull(curVersion)) {
				continue;
			}

			int compareTo = curVersion.compareTo(
				latestProductVirtualSettingsFileEntry.getVersion());

			if (compareTo > 0) {
				latestProductVirtualSettingsFileEntry =
					productVirtualSettingsFileEntry;
			}
		}

		return latestProductVirtualSettingsFileEntry;
	}

	public HttpResponse<InputStream> getAssetHttpResponse(String assetURL)
		throws Exception {

		HttpClient httpClient = HttpClient.newHttpClient();

		HttpRequest httpRequest = HttpRequest.newBuilder(
		).uri(
			URI.create(
				StringBundler.concat(
					lxcDXPServerProtocol, "://", lxcDXPMainDomain, assetURL))
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).GET(
		).build();

		HttpResponse<InputStream> httpResponse = httpClient.send(
			httpRequest, HttpResponse.BodyHandlers.ofInputStream());

		if (httpResponse.statusCode() >= HttpURLConnection.HTTP_BAD_REQUEST) {
			throw new IOException(
				StringBundler.concat(
					"Unable to download ", assetURL, " ",
					httpResponse.statusCode()));
		}

		return httpResponse;
	}

	public List<ProductVirtualSettingsFileEntry>
			getProductVirtualSettingsFileEntries(long productId)
		throws Exception {

		ProductVirtualSettingsResource productVirtualSettingsResource =
			ProductVirtualSettingsResource.builder(
			).endpoint(
				getDXPEndpointAddress(), lxcDXPServerProtocol
			).header(
				HttpHeaders.AUTHORIZATION, getAuthorization()
			).build();

		ProductVirtualSettings productVirtualSettings =
			productVirtualSettingsResource.getProductIdProductVirtualSettings(
				productId);

		if (productVirtualSettings == null) {
			return Collections.emptyList();
		}

		ProductVirtualSettingsFileEntryResource
			productVirtualSettingsFileEntryResource =
				ProductVirtualSettingsFileEntryResource.builder(
				).endpoint(
					getDXPEndpointAddress(), lxcDXPServerProtocol
				).header(
					HttpHeaders.AUTHORIZATION, getAuthorization()
				).build();

		return List.copyOf(
			productVirtualSettingsFileEntryResource.
				getProductVirtualSettingIdProductVirtualSettingsFileEntriesPage(
					productVirtualSettings.getId(), Pagination.of(1, 100)
				).getItems());
	}

	@Cacheable("productVirtualSettingsFileEntryChecksum")
	public String getSHA256Checksum(String src) throws Exception {
		MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");

		HttpResponse<InputStream> httpResponse = getAssetHttpResponse(src);

		try (InputStream inputStream = httpResponse.body()) {
			byte[] buffer = new byte[_BUFFER_SIZE];

			while (true) {
				int count = inputStream.read(buffer);

				if (count == -1) {
					break;
				}

				messageDigest.update(buffer, 0, count);
			}
		}

		HexFormat hexFormat = HexFormat.of();

		return hexFormat.formatHex(messageDigest.digest());
	}

	private static final int _BUFFER_SIZE = 8192;

}