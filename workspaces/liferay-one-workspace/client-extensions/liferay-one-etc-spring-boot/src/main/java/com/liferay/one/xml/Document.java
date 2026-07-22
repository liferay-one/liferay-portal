/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.xml;

import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;

/**
 * @author Allen Ziegenfus
 */
public class Document {

	public Element addElement(String name) {
		_rootElement = new Element(name);

		return _rootElement;
	}

	public String formattedString() {
		StringBundler sb = new StringBundler();

		sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");

		if (_rootElement != null) {
			_rootElement.write(sb, StringPool.BLANK);
		}

		return sb.toString();
	}

	public Element getRootElement() {
		return _rootElement;
	}

	public void setRootElement(Element rootElement) {
		_rootElement = rootElement;
	}

	private Element _rootElement;

}