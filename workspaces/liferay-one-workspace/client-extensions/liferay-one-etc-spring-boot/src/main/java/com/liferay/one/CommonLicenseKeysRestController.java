/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommonLicenseKeyService;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Allen Ziegenfus
 */
@RequestMapping("/common-license-keys")
@RestController
public class CommonLicenseKeysRestController extends OneBaseRestController {

	@PostMapping
	public void postCommonLicenseKeys(
			@RequestParam("productGroup") String productGroup,
			@RequestParam("files") MultipartFile[] multipartFiles)
		throws Exception {

		for (MultipartFile multipartFile : multipartFiles) {
			String fileName = multipartFile.getOriginalFilename();

			if (_commonLicenseKeyService.hasCommonLicenseKey(fileName)) {
				throw new ResponseStatusException(
					HttpStatus.CONFLICT,
					"A common license key already exists for the file " +
						fileName);
			}

			try {
				_commonLicenseKeyService.addCommonLicenseKey(
					new String(
						multipartFile.getBytes(), StandardCharsets.UTF_8),
					fileName, multipartFile.getSize(), productGroup);
			}
			catch (IllegalArgumentException illegalArgumentException) {
				throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"Unable to parse the license file " + fileName,
					illegalArgumentException);
			}
		}
	}

	@Autowired
	private CommonLicenseKeyService _commonLicenseKeyService;

}