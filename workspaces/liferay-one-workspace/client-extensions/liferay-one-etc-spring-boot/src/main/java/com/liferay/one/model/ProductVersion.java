/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import org.json.JSONObject;

/**
 * @author Allen Ziegenfus
 */
public class ProductVersion {

	public ProductVersion(JSONObject jsonObject) {
		_productGroup = jsonObject.optString("productGroup");
		_productGroupVersion = jsonObject.optString("productGroupVersion");
		_productVersionId = jsonObject.getLong("id");
		_supported = jsonObject.optBoolean("supported");
		_version = jsonObject.optString("productVersion");
	}

	public String getProductGroup() {
		return _productGroup;
	}

	public String getProductGroupVersion() {
		return _productGroupVersion;
	}

	public long getProductVersionId() {
		return _productVersionId;
	}

	public String getVersion() {
		return _version;
	}

	public boolean isSupported() {
		return _supported;
	}

	private final String _productGroup;
	private final String _productGroupVersion;
	private final long _productVersionId;
	private final boolean _supported;
	private final String _version;

}