/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.CommonLicenseKeyService;

import java.nio.charset.StandardCharsets;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeysRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_commonLicenseKeyService = Mockito.mock(CommonLicenseKeyService.class);

		_commonLicenseKeysRestController =
			new CommonLicenseKeysRestController();

		ReflectionTestUtils.setField(
			_commonLicenseKeysRestController, "_adminPermission",
			Mockito.mock(AdminPermission.class));
		ReflectionTestUtils.setField(
			_commonLicenseKeysRestController, "_commonLicenseKeyService",
			_commonLicenseKeyService);
	}

	@Test
	public void testDeleteCommonLicenseKey() throws Exception {
		_commonLicenseKeysRestController.deleteCommonLicenseKey(null, 5L);

		Mockito.verify(
			_commonLicenseKeyService
		).deleteCommonLicenseKey(
			5L
		);
	}

	@Test
	public void testGetCommonLicenseKeys() throws Exception {
		JSONObject pageJSONObject = new JSONObject(
		).put(
			"totalCount", 1
		);

		Mockito.when(
			_commonLicenseKeyService.getCommonLicenseKeysPage(1, 20, "COMMERCE")
		).thenReturn(
			pageJSONObject
		);

		ResponseEntity<String> responseEntity =
			_commonLicenseKeysRestController.getCommonLicenseKeys(
				1, 20, "COMMERCE");

		Assertions.assertEquals(
			pageJSONObject.toString(), responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			MediaType.APPLICATION_JSON, httpHeaders.getContentType());
	}

	@Test
	public void testGetCommonLicenseKeysDownload() throws Exception {
		JSONObject jsonObject = new JSONObject(
		).put(
			"fileContent", "<license/>"
		).put(
			"fileName", "commerce-prod.xml"
		);

		Mockito.when(
			_commonLicenseKeyService.getCommonLicenseKey(5L)
		).thenReturn(
			jsonObject
		);

		ResponseEntity<String> responseEntity =
			_commonLicenseKeysRestController.getCommonLicenseKeysDownload(5L);

		Assertions.assertEquals("<license/>", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"commerce-prod.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
		Assertions.assertEquals(
			MediaType.APPLICATION_XML, httpHeaders.getContentType());
	}

	@Test
	public void testGetCommonLicenseKeysRejectsLargePageSize()
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _commonLicenseKeysRestController.getCommonLicenseKeys(
					1, 101, "COMMERCE"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_commonLicenseKeyService, Mockito.never()
		).getCommonLicenseKeysPage(
			Mockito.anyInt(), Mockito.anyInt(), Mockito.anyString()
		);
	}

	@Test
	public void testPostCommonLicenseKeys() throws Exception {
		MultipartFile multipartFile = new MockMultipartFile(
			"files", "commerce.xml", "text/xml",
			"<license/>".getBytes(StandardCharsets.UTF_8));

		_commonLicenseKeysRestController.postCommonLicenseKeys(
			null, "COMMERCE", new MultipartFile[] {multipartFile});

		Mockito.verify(
			_commonLicenseKeyService
		).addCommonLicenseKey(
			"<license/>", "commerce.xml", 10L, "COMMERCE"
		);
	}

	@Test
	public void testPostCommonLicenseKeysRejectsDuplicate() throws Exception {
		Mockito.when(
			_commonLicenseKeyService.hasCommonLicenseKey("commerce.xml")
		).thenReturn(
			true
		);

		MultipartFile multipartFile = new MockMultipartFile(
			"files", "commerce.xml", "text/xml",
			"<license/>".getBytes(StandardCharsets.UTF_8));

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _commonLicenseKeysRestController.postCommonLicenseKeys(
					null, "COMMERCE", new MultipartFile[] {multipartFile}));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());

		Mockito.verify(
			_commonLicenseKeyService, Mockito.never()
		).addCommonLicenseKey(
			Mockito.anyString(), Mockito.anyString(), Mockito.anyLong(),
			Mockito.anyString()
		);
	}

	@Test
	public void testPostCommonLicenseKeysRejectsUnparsableFile()
		throws Exception {

		Mockito.doThrow(
			new IllegalArgumentException()
		).when(
			_commonLicenseKeyService
		).addCommonLicenseKey(
			Mockito.anyString(), Mockito.anyString(), Mockito.anyLong(),
			Mockito.anyString()
		);

		MultipartFile multipartFile = new MockMultipartFile(
			"files", "commerce.xml", "text/xml",
			"garbage".getBytes(StandardCharsets.UTF_8));

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _commonLicenseKeysRestController.postCommonLicenseKeys(
					null, "COMMERCE", new MultipartFile[] {multipartFile}));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());
	}

	private CommonLicenseKeyService _commonLicenseKeyService;
	private CommonLicenseKeysRestController _commonLicenseKeysRestController;

}