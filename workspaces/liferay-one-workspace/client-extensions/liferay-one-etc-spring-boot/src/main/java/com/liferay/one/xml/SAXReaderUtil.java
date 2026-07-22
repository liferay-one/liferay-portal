/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.xml;

import com.liferay.petra.string.CharPool;
import com.liferay.portal.kernel.util.StringUtil;

/**
 * @author Allen Ziegenfus
 */
public class SAXReaderUtil {

	public static Document createDocument() {
		return new Document();
	}

	public static Document read(String xml) {
		Document document = new Document();

		int[] position = {0};

		document.setRootElement(_read(xml, position));

		return document;
	}

	private static boolean _isNameEnd(char c) {
		if ((c == CharPool.GREATER_THAN) || (c == CharPool.SLASH) ||
			Character.isWhitespace(c)) {

			return true;
		}

		return false;
	}

	private static Element _read(String xml, int[] position) {
		_skipProlog(xml, position);

		position[0]++;

		int nameStart = position[0];

		while (!_isNameEnd(xml.charAt(position[0]))) {
			position[0]++;
		}

		Element element = new Element(xml.substring(nameStart, position[0]));

		int tagEnd = xml.indexOf(CharPool.GREATER_THAN, position[0]);

		if (xml.charAt(tagEnd - 1) == CharPool.SLASH) {
			position[0] = tagEnd + 1;

			return element;
		}

		position[0] = tagEnd + 1;

		boolean hasChildElements = false;

		while (true) {
			int index = xml.indexOf(CharPool.LESS_THAN, position[0]);

			if (xml.charAt(index + 1) == CharPool.SLASH) {
				if (!hasChildElements) {
					element.addText(
						_unescape(xml.substring(position[0], index)));
				}

				position[0] = xml.indexOf(CharPool.GREATER_THAN, index) + 1;

				return element;
			}

			position[0] = index;

			element.add(_read(xml, position));

			hasChildElements = true;
		}
	}

	private static void _skipProlog(String xml, int[] position) {
		while (true) {
			while (Character.isWhitespace(xml.charAt(position[0]))) {
				position[0]++;
			}

			if (xml.startsWith("<?", position[0])) {
				position[0] = xml.indexOf("?>", position[0]) + 2;

				continue;
			}

			return;
		}
	}

	private static String _unescape(String text) {
		text = StringUtil.replace(text, "&gt;", ">");
		text = StringUtil.replace(text, "&lt;", "<");
		text = StringUtil.replace(text, "&amp;", "&");

		return text;
	}

}