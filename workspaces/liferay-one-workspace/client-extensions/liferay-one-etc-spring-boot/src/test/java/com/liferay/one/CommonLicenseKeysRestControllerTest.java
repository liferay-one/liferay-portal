/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommonLicenseKeyService;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
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
			_commonLicenseKeysRestController, "_commonLicenseKeyService",
			_commonLicenseKeyService);
	}

	@Test
	public void testPostCommonLicenseKeys() throws Exception {
		MultipartFile multipartFile = new MockMultipartFile(
			"files", "commerce.xml", "text/xml",
			"<license/>".getBytes(StandardCharsets.UTF_8));

		_commonLicenseKeysRestController.postCommonLicenseKeys(
			"COMMERCE", new MultipartFile[] {multipartFile});

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
					"COMMERCE", new MultipartFile[] {multipartFile}));

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
					"COMMERCE", new MultipartFile[] {multipartFile}));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());
	}

	private CommonLicenseKeyService _commonLicenseKeyService;
	private CommonLicenseKeysRestController _commonLicenseKeysRestController;

}