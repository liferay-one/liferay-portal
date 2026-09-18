/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.portal.kernel.util.Validator;

import org.json.JSONObject;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Felipe Franca
 */
@Component
public class CommerceChannelService extends OneBaseService {

	@CacheEvict("channelId")
	public void evictChannelId(String externalReferenceCode) {
	}

	@Cacheable("channelId")
	public Long fetchChannelId(String externalReferenceCode) throws Exception {
		String response = fetch(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/headless-commerce-admin-channel/v1.0/channels" +
					"/by-externalReferenceCode/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		if (Validator.isNull(response)) {
			throw new Exception(
				"Unable to find commerce channel " + externalReferenceCode);
		}

		JSONObject jsonObject = new JSONObject(response);

		return jsonObject.getLong("id");
	}

}