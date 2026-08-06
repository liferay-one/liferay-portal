/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.CommonLicenseKeyService;

import java.nio.charset.StandardCharsets;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

	@DeleteMapping("/{commonLicenseKeyId}")
	public void deleteCommonLicenseKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("commonLicenseKeyId") long commonLicenseKeyId)
		throws Exception {

		_adminPermission.check(jwt);

		_commonLicenseKeyService.deleteCommonLicenseKey(commonLicenseKeyId);
	}

	@GetMapping
	public ResponseEntity<String> getCommonLicenseKeys(
			@RequestParam("page") int page,
			@RequestParam("pageSize") int pageSize,
			@RequestParam("productGroup") String productGroup)
		throws Exception {

		if ((pageSize < 1) || (pageSize > _MAX_PAGE_SIZE)) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"The page size must be between 1 and " + _MAX_PAGE_SIZE);
		}

		JSONObject jsonObject =
			_commonLicenseKeyService.getCommonLicenseKeysPage(
				page, pageSize, productGroup);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			jsonObject.toString()
		);
	}

	@GetMapping("/{commonLicenseKeyId}/download")
	public ResponseEntity<String> getCommonLicenseKeysDownload(
			@PathVariable("commonLicenseKeyId") long commonLicenseKeyId)
		throws Exception {

		JSONObject jsonObject = _commonLicenseKeyService.getCommonLicenseKey(
			commonLicenseKeyId);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + jsonObject.getString("fileName") + "\""
		).body(
			jsonObject.getString("fileContent")
		);
	}

	@PostMapping
	public void postCommonLicenseKeys(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("productGroup") String productGroup,
			@RequestParam("files") MultipartFile[] multipartFiles)
		throws Exception {

		_adminPermission.check(jwt);

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

	private static final int _MAX_PAGE_SIZE = 100;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private CommonLicenseKeyService _commonLicenseKeyService;

}