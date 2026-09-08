/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.CommerceOrderPermission;
import com.liferay.one.service.CommerceOrderService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Ricardo Mariz
 */
@RequestMapping("/ai-hub")
@RestController
public class AIHubRestController extends OneBaseRestController {

	@PostMapping("/opportunities/{orderId}")
	public void postOpportunities(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("orderId") long orderId)
		throws Exception {

		_commerceOrderPermission.check(orderId, jwt);

		_commerceOrderService.createAIHubOpportunity(orderId);
	}

	@Autowired
	private CommerceOrderPermission _commerceOrderPermission;

	@Autowired
	private CommerceOrderService _commerceOrderService;

}