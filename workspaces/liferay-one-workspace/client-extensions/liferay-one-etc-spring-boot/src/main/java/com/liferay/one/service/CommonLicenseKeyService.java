/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.CommonLicenseKeyConstants;
import com.liferay.one.constants.UploadProductEnvironmentConstants;
import com.liferay.one.license.CommonLicenseKeyData;
import com.liferay.one.license.CommonLicenseKeyParser;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Allen Ziegenfus
 */
@Component
public class CommonLicenseKeyService extends OneBaseService {

	public void addCommonLicenseKey(
			String fileContent, String fileName, long fileSize,
			String productGroup)
		throws Exception {

		CommonLicenseKeyData commonLicenseKeyData = null;

		if (StringUtil.equals(
				productGroup,
				CommonLicenseKeyConstants.PRODUCT_GROUP_ENTERPRISE_SEARCH)) {

			commonLicenseKeyData =
				_commonLicenseKeyParser.parseEnterpriseSearch(fileContent);
		}
		else {
			commonLicenseKeyData = _commonLicenseKeyParser.parseCommerce(
				fileContent);
		}

		String productFamily = CommonLicenseKeyConstants.toProductFamily(
			productGroup);

		JSONObject jsonObject = new JSONObject(
		).put(
			"endDate",
			commonLicenseKeyData.getEndDateInstant(
			).toString()
		).put(
			"environmentType",
			new JSONObject(
			).put(
				"key",
				_toEnvironmentTypeKey(
					commonLicenseKeyData.getProductEnvironment())
			)
		).put(
			"fileContent", fileContent
		).put(
			"fileName", fileName
		).put(
			"fileSize", fileSize
		).put(
			"productFamily",
			new JSONObject(
			).put(
				"key", productFamily
			)
		).put(
			"startDate",
			commonLicenseKeyData.getStartDateInstant(
			).toString()
		);

		postCommonLicenseKey(jsonObject);
	}

	public void deleteCommonLicenseKey(long commonLicenseKeyId)
		throws Exception {

		delete(
			getAuthorization(), StringPool.BLANK,
			UriComponentsBuilder.fromPath(
				"/o/c/commonlicensekeys/" + commonLicenseKeyId
			).build(
			).toUri());
	}

	public JSONObject getCommonLicenseKey(long commonLicenseKeyId)
		throws Exception {

		return new JSONObject(
			get(
				getAuthorization(),
				UriComponentsBuilder.fromPath(
					"/o/c/commonlicensekeys/" + commonLicenseKeyId
				).build(
				).toUri()));
	}

	public JSONObject getCommonLicenseKeysPage(
			int page, int pageSize, String productGroup)
		throws Exception {

		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/commonlicensekeys"
			).queryParam(
				"filter",
				"productFamily eq '" +
					CommonLicenseKeyConstants.toProductFamily(productGroup) +
						"'"
			).queryParam(
				"page", page
			).queryParam(
				"pageSize", pageSize
			).build(
			).toUri());

		JSONObject pageJSONObject = new JSONObject(response);

		JSONArray itemsJSONArray = pageJSONObject.getJSONArray("items");

		JSONArray reshapedItemsJSONArray = new JSONArray();

		for (int i = 0; i < itemsJSONArray.length(); i++) {
			JSONObject itemJSONObject = itemsJSONArray.getJSONObject(i);

			JSONObject environmentTypeJSONObject = itemJSONObject.optJSONObject(
				"environmentType");

			String productEnvironment = "";

			if (environmentTypeJSONObject != null) {
				productEnvironment = environmentTypeJSONObject.optString("key");
			}

			reshapedItemsJSONArray.put(
				new JSONObject(
				).put(
					"endDate", itemJSONObject.optString("endDate")
				).put(
					"id", itemJSONObject.optLong("id")
				).put(
					"name", itemJSONObject.optString("fileName")
				).put(
					"productEnvironment", productEnvironment
				).put(
					"startDate", itemJSONObject.optString("startDate")
				));
		}

		pageJSONObject.put("items", reshapedItemsJSONArray);

		return pageJSONObject;
	}

	public boolean hasCommonLicenseKey(String fileName) throws Exception {
		List<JSONObject> commonLicenseKeys = _getCommonLicenseKeys(fileName);

		return !commonLicenseKeys.isEmpty();
	}

	protected void postCommonLicenseKey(JSONObject jsonObject)
		throws Exception {

		post(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/commonlicensekeys"
			).build(
			).toUri());
	}

	private List<JSONObject> _getCommonLicenseKeys(String fileName)
		throws Exception {

		return getAllItems(
			"/o/c/commonlicensekeys",
			"fileName eq '" + StringUtil.replace(fileName, '\'', "''") + "'",
			jsonObject -> jsonObject);
	}

	private String _toEnvironmentTypeKey(String productEnvironment) {
		if (StringUtil.equals(
				productEnvironment,
				UploadProductEnvironmentConstants.NONPRODUCTION)) {

			return "nonProduction";
		}

		return productEnvironment;
	}

	@Autowired
	private CommonLicenseKeyParser _commonLicenseKeyParser;

}