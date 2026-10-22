/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * @author Beatriz Costa
 */
@Service
public class PublisherAccountRequestService extends OneBaseService {

	public void sendCongratulationsPublisherNotification(
			JSONObject modelPublisherAccountRequestJSONObject)
		throws Exception {

		String emailAddress = modelPublisherAccountRequestJSONObject.optString(
			"emailAddress");

		if (Validator.isNull(emailAddress)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to send congratulations notification because " +
						"email address is missing");
			}

			return;
		}

		String publisherName = _getPublisherName(
			emailAddress, modelPublisherAccountRequestJSONObject);

		JSONObject processedTemplateJSONObject =
			_notificationTemplateService.getAndProcessTemplateJSONObject(
				"MARKETPLACE-CONGRATULATIONS-TO-BE-A-PUBLISHER",
				_LANGUAGE_ID_DEFAULT,
				HashMapBuilder.put(
					"CATALOG_NAME", publisherName
				).put(
					"CPDEFINITION_PRODUCTID", ""
				).put(
					"PUBLISHER_IMAGE", _getPublisherImage()
				).put(
					"PUBLISHER_NAME", publisherName
				).build());

		_notificationQueueEntryService.addNotificationQueueEntry(
			processedTemplateJSONObject.optString(
				"from", "do-not-reply@liferay.com"),
			processedTemplateJSONObject.optString("fromName", "One Liferay"),
			emailAddress, processedTemplateJSONObject.getString("subject"),
			processedTemplateJSONObject.getString("body"));
	}

	public void sendNewPublisherRequestNotification(
			JSONObject modelPublisherAccountRequestJSONObject)
		throws Exception {

		String emailAddress = modelPublisherAccountRequestJSONObject.optString(
			"emailAddress");

		if (Validator.isNull(emailAddress)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to send new publisher request notification " +
						"because email address is missing");
			}

			return;
		}

		String publisherName = _getPublisherName(
			emailAddress, modelPublisherAccountRequestJSONObject);

		JSONObject processedTemplateJSONObject =
			_notificationTemplateService.getAndProcessTemplateJSONObject(
				"MARKETPLACE-NEW-PUBLISHER-REQUEST-PUBLISHER",
				_LANGUAGE_ID_DEFAULT,
				HashMapBuilder.put(
					"CATALOG_NAME", publisherName
				).put(
					"PUBLISHER_IMAGE", _getPublisherImage()
				).put(
					"PUBLISHER_NAME", publisherName
				).build());

		_notificationQueueEntryService.addNotificationQueueEntry(
			processedTemplateJSONObject.optString(
				"from", "do-not-reply@liferay.com"),
			processedTemplateJSONObject.optString("fromName", "One Liferay"),
			emailAddress, processedTemplateJSONObject.getString("subject"),
			processedTemplateJSONObject.getString("body"));
	}

	private String _getPublisherImage() {
		return StringBundler.concat(
			lxcDXPServerProtocol, "://", lxcDXPMainDomain,
			"/documents/d/one/marketplace_default_avatar.png");
	}

	private String _getPublisherName(
		String emailAddress,
		JSONObject modelPublisherAccountRequestJSONObject) {

		String publisherName = StringBundler.concat(
			modelPublisherAccountRequestJSONObject.optString("firstName"), " ",
			modelPublisherAccountRequestJSONObject.optString("lastName")
		).trim();

		if (Validator.isNull(publisherName)) {
			return emailAddress;
		}

		return publisherName;
	}

	private static final String _LANGUAGE_ID_DEFAULT = "en_US";

	private static final Log _log = LogFactory.getLog(
		PublisherAccountRequestService.class);

	@Autowired
	private NotificationQueueEntryService _notificationQueueEntryService;

	@Autowired
	private NotificationTemplateService _notificationTemplateService;

}