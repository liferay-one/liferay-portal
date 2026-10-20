/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.util.CommerceOrderCSVUtil;
import com.liferay.portal.kernel.util.Validator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Ryan Schuhler
 */
@RequestMapping("/orders")
@RestController
public class OrdersRestController extends OneBaseRestController {

	@GetMapping("/export")
	public ResponseEntity<String> getOrdersExport(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) String filters)
		throws Exception {

		_adminPermission.check(jwt);

		return ResponseEntity.ok(
		).contentType(
			_CONTENT_TYPE_CSV
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + CommerceOrderCSVUtil.FILE_NAME + "\""
		).body(
			CommerceOrderCSVUtil.toCSV(
				_commerceOrderService.getLatestOrders(
					Validator.isNull(filters) ? null : filters, _MAX_ORDERS))
		);
	}

	private static final MediaType _CONTENT_TYPE_CSV = MediaType.parseMediaType(
		"text/csv");

	private static final int _MAX_ORDERS = 10000;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private CommerceOrderService _commerceOrderService;

}