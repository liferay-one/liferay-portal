/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettings;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductVirtualSettingsFileEntryResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductVirtualSettingsResource;

import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.net.InetSocketAddress;

import java.nio.charset.StandardCharsets;

import java.security.MessageDigest;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[SVC-COMMERCEPRODUCTVIRTUALSETTINGSSERVICE] " +
		"CommerceProductVirtualSettingsService"
)
public class CommerceProductVirtualSettingsServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		ProductVirtualSettingsResource.Builder
			productVirtualSettingsResourceBuilder = Mockito.mock(
				ProductVirtualSettingsResource.Builder.class,
				Mockito.RETURNS_SELF);

		Mockito.when(
			productVirtualSettingsResourceBuilder.build()
		).thenReturn(
			_productVirtualSettingsResource
		);

		_productVirtualSettingsResourceMockedStatic = Mockito.mockStatic(
			ProductVirtualSettingsResource.class);

		_productVirtualSettingsResourceMockedStatic.when(
			ProductVirtualSettingsResource::builder
		).thenReturn(
			productVirtualSettingsResourceBuilder
		);

		ProductVirtualSettingsFileEntryResource.Builder
			productVirtualSettingsFileEntryResourceBuilder = Mockito.mock(
				ProductVirtualSettingsFileEntryResource.Builder.class,
				Mockito.RETURNS_SELF);

		Mockito.when(
			productVirtualSettingsFileEntryResourceBuilder.build()
		).thenReturn(
			_productVirtualSettingsFileEntryResource
		);

		_productVirtualSettingsFileEntryResourceMockedStatic =
			Mockito.mockStatic(ProductVirtualSettingsFileEntryResource.class);

		_productVirtualSettingsFileEntryResourceMockedStatic.when(
			ProductVirtualSettingsFileEntryResource::builder
		).thenReturn(
			productVirtualSettingsFileEntryResourceBuilder
		);

		_httpServer = HttpServer.create(new InetSocketAddress(0), 0);

		_httpServer.createContext(
			"/documents",
			httpExchange -> {
				_authorizations.add(
					httpExchange.getRequestHeaders(
					).getFirst(
						HttpHeaders.AUTHORIZATION
					));

				byte[] bytes = _assetBytes;

				httpExchange.sendResponseHeaders(
					_assetStatusCode, bytes.length);

				try (OutputStream outputStream =
						httpExchange.getResponseBody()) {

					outputStream.write(bytes);
				}
			});

		_httpServer.start();

		InetSocketAddress inetSocketAddress = _httpServer.getAddress();

		ReflectionTestUtils.setField(
			_commerceProductVirtualSettingsService, "lxcDXPMainDomain",
			"localhost:" + inetSocketAddress.getPort());
	}

	@AfterEach
	public void tearDown() {
		_httpServer.stop(0);

		_productVirtualSettingsFileEntryResourceMockedStatic.close();
		_productVirtualSettingsResourceMockedStatic.close();
	}

	@Test
	public void testFetchByIdReturnsMatchingEntry() throws Exception {
		_whenFileEntries(
			_createProductVirtualSettingsFileEntry(1L, "7.3"),
			_createProductVirtualSettingsFileEntry(2L, "7.4"));

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, 2L);

		Assertions.assertEquals(2L, productVirtualSettingsFileEntry.getId());

		Assertions.assertNull(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, 3L));
	}

	@Test
	public void testFetchByVersionFallsBackToTheLatestVersion()
		throws Exception {

		_whenFileEntries(
			_createProductVirtualSettingsFileEntry(1L, "7.3"),
			_createProductVirtualSettingsFileEntry(2L, "7.4"),
			_createProductVirtualSettingsFileEntry(3L, null),
			_createProductVirtualSettingsFileEntry(4L, "7.2"));

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, "2025.q1");

		Assertions.assertEquals(2L, productVirtualSettingsFileEntry.getId());

		productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, (String)null);

		Assertions.assertEquals(2L, productVirtualSettingsFileEntry.getId());
	}

	@Test
	public void testFetchByVersionReturnsExactVersionMatch() throws Exception {
		_whenFileEntries(
			_createProductVirtualSettingsFileEntry(1L, "7.3"),
			_createProductVirtualSettingsFileEntry(2L, "7.4"));

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, "7.3");

		Assertions.assertEquals(1L, productVirtualSettingsFileEntry.getId());
	}

	@Test
	public void testFetchByVersionWithoutEntriesReturnsNull() throws Exception {
		_whenFileEntries();

		Assertions.assertNull(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(10L, "7.4"));
	}

	@Test
	public void testGetAssetHttpResponseThrowsOnErrorStatus() {
		_assetStatusCode = 404;

		IOException ioException = Assertions.assertThrows(
			IOException.class,
			() -> _commerceProductVirtualSettingsService.getAssetHttpResponse(
				"/documents/missing"));

		Assertions.assertEquals(
			"Unable to download /documents/missing 404",
			ioException.getMessage());
	}

	@Test
	public void testGetEntriesWithoutVirtualSettingsReturnsEmptyList()
		throws Exception {

		Mockito.when(
			_productVirtualSettingsResource.getProductIdProductVirtualSettings(
				10L)
		).thenReturn(
			null
		);

		Assertions.assertTrue(
			_commerceProductVirtualSettingsService.
				getProductVirtualSettingsFileEntries(
					10L
				).isEmpty());

		Mockito.verifyNoInteractions(_productVirtualSettingsFileEntryResource);
	}

	@Test
	public void testGetSHA256Checksum() throws Exception {
		_assetBytes = new byte[20000];

		Arrays.fill(_assetBytes, (byte)'a');

		MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");

		HexFormat hexFormat = HexFormat.of();

		Assertions.assertEquals(
			hexFormat.formatHex(messageDigest.digest(_assetBytes)),
			_commerceProductVirtualSettingsService.getSHA256Checksum(
				"/documents/asset"));

		Assertions.assertEquals(List.of("Bearer test"), _authorizations);
	}

	private ProductVirtualSettingsFileEntry
		_createProductVirtualSettingsFileEntry(long id, String version) {

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			new ProductVirtualSettingsFileEntry();

		productVirtualSettingsFileEntry.setId(id);
		productVirtualSettingsFileEntry.setVersion(version);

		return productVirtualSettingsFileEntry;
	}

	private void _whenFileEntries(
			ProductVirtualSettingsFileEntry...
				productVirtualSettingsFileEntries)
		throws Exception {

		ProductVirtualSettings productVirtualSettings =
			new ProductVirtualSettings();

		productVirtualSettings.setId(20L);

		Mockito.when(
			_productVirtualSettingsResource.getProductIdProductVirtualSettings(
				10L)
		).thenReturn(
			productVirtualSettings
		);

		Page<ProductVirtualSettingsFileEntry> page = Mockito.mock(Page.class);

		Mockito.when(
			page.getItems()
		).thenReturn(
			Arrays.asList(productVirtualSettingsFileEntries)
		);

		Mockito.when(
			_productVirtualSettingsFileEntryResource.
				getProductVirtualSettingIdProductVirtualSettingsFileEntriesPage(
					ArgumentMatchers.eq(20L),
					ArgumentMatchers.any(Pagination.class))
		).thenReturn(
			page
		);
	}

	private byte[] _assetBytes = "asset".getBytes(StandardCharsets.UTF_8);
	private int _assetStatusCode = 200;
	private final List<String> _authorizations = new ArrayList<>();

	private final CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService =
			new CommerceProductVirtualSettingsService() {
				{
					lxcDXPServerProtocol = "http";
				}

				@Override
				protected String getAuthorization() {
					return "Bearer test";
				}

				@Override
				protected String getDXPEndpointAddress() {
					return "localhost:8080";
				}

			};

	private HttpServer _httpServer;
	private final ProductVirtualSettingsFileEntryResource
		_productVirtualSettingsFileEntryResource = Mockito.mock(
			ProductVirtualSettingsFileEntryResource.class);
	private MockedStatic<ProductVirtualSettingsFileEntryResource>
		_productVirtualSettingsFileEntryResourceMockedStatic;
	private final ProductVirtualSettingsResource
		_productVirtualSettingsResource = Mockito.mock(
			ProductVirtualSettingsResource.class);
	private MockedStatic<ProductVirtualSettingsResource>
		_productVirtualSettingsResourceMockedStatic;

}