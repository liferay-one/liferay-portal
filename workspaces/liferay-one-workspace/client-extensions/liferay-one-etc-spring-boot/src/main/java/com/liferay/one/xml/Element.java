/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.xml;

import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.ArrayList;
import java.util.List;

/**
 * @author Allen Ziegenfus
 */
public class Element {

	public Element(String name) {
		_name = name;
	}

	public void add(Element element) {
		_elements.add(element);
	}

	public Element addElement(String name) {
		Element element = new Element(name);

		_elements.add(element);

		return element;
	}

	public void addText(String text) {
		_text = text;
	}

	public void write(StringBundler sb, String indent) {
		sb.append(indent);
		sb.append(StringPool.LESS_THAN);
		sb.append(_name);

		if (_elements.isEmpty() && (_text == null)) {
			sb.append("/>\n");

			return;
		}

		sb.append(StringPool.GREATER_THAN);

		if (_elements.isEmpty()) {
			sb.append(_escape(_text));
			sb.append("</");
			sb.append(_name);
			sb.append(StringPool.GREATER_THAN);
			sb.append(StringPool.NEW_LINE);

			return;
		}

		sb.append(StringPool.NEW_LINE);

		for (Element element : _elements) {
			element.write(sb, indent + StringPool.TAB);
		}

		sb.append(indent);
		sb.append("</");
		sb.append(_name);
		sb.append(StringPool.GREATER_THAN);
		sb.append(StringPool.NEW_LINE);
	}

	private String _escape(String text) {
		text = StringUtil.replace(text, '&', "&amp;");
		text = StringUtil.replace(text, '<', "&lt;");
		text = StringUtil.replace(text, '>', "&gt;");

		return text;
	}

	private final List<Element> _elements = new ArrayList<>();
	private final String _name;
	private String _text;

}