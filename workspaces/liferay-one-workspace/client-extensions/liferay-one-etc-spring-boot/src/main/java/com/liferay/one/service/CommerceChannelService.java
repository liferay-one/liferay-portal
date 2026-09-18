/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.channel.client.dto.v1_0.Channel;
import com.liferay.headless.commerce.admin.channel.client.resource.v1_0.ChannelResource;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class CommerceChannelService extends OneBaseService {

	@CacheEvict("channel")
	public void evictChannel(String externalReferenceCode) {
	}

	@Cacheable("channel")
	public Channel fetchChannel(String externalReferenceCode) throws Exception {
		ChannelResource channelResource = _buildChannelResource();

		return channelResource.getChannelByExternalReferenceCode(
			externalReferenceCode);
	}

	private ChannelResource _buildChannelResource() {
		return ChannelResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

}