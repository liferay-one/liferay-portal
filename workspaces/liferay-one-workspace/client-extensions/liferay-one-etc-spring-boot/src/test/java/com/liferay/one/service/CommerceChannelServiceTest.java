/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.channel.client.dto.v1_0.Channel;
import com.liferay.headless.commerce.admin.channel.client.resource.v1_0.ChannelResource;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-COMMERCECHANNELSERVICE] CommerceChannelService")
public class CommerceChannelServiceTest {

	@BeforeEach
	public void setUp() {
		_builder = Mockito.mock(
			ChannelResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			_builder.build()
		).thenReturn(
			_channelResource
		);

		_channelResourceMockedStatic = Mockito.mockStatic(
			ChannelResource.class);

		_channelResourceMockedStatic.when(
			ChannelResource::builder
		).thenReturn(
			_builder
		);
	}

	@AfterEach
	public void tearDown() {
		_channelResourceMockedStatic.close();
	}

	@Test
	public void testEvictChannelDoesNotCallTheChannelResource() {
		_commerceChannelService.evictChannel("CHANNEL-1");

		Mockito.verifyNoInteractions(_channelResource);
	}

	@Test
	public void testFetchChannelPropagatesException() throws Exception {
		Mockito.when(
			_channelResource.getChannelByExternalReferenceCode("CHANNEL-1")
		).thenThrow(
			new IllegalStateException()
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _commerceChannelService.fetchChannel("CHANNEL-1"));
	}

	@Test
	public void testFetchChannelReturnsChannelByExternalReferenceCode()
		throws Exception {

		Channel channel = new Channel();

		Mockito.when(
			_channelResource.getChannelByExternalReferenceCode("CHANNEL-1")
		).thenReturn(
			channel
		);

		Assertions.assertSame(
			channel, _commerceChannelService.fetchChannel("CHANNEL-1"));

		Mockito.verify(
			_builder
		).endpoint(
			"localhost:8080", "http"
		);

		Mockito.verify(
			_builder
		).header(
			HttpHeaders.AUTHORIZATION, "Bearer test"
		);
	}

	private ChannelResource.Builder _builder;
	private final ChannelResource _channelResource = Mockito.mock(
		ChannelResource.class);
	private MockedStatic<ChannelResource> _channelResourceMockedStatic;

	private final CommerceChannelService _commerceChannelService =
		new CommerceChannelService() {
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

}