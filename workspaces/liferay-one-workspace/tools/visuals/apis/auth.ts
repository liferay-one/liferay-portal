/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads how a sidecar handler checks its caller. A check is a call to one of
 * the com.liferay.one.permission classes, a call to a validator's validate
 * method (a DXP environment proves itself with a signed token, not a Jwt), a
 * call to hasAccountMembership, or a throw of PrincipalException, in the
 * handler or in a private method of the same class that the handler calls.
 *
 * The result says that a check runs, not that the check is correct. A handler
 * that checks the wrong ID, or trusts a value it should not, still reads as
 * checked. Those defects stay in the Go-Live Tasks artifact.
 */

export interface IAuth {

	/**
	 * Each check that the handler reaches, such as "ProjectPermission.check
	 * VIEW".
	 */
	checks: string[];

	/**
	 * Whether the handler takes the caller's Jwt or Principal.
	 */
	jwt: boolean;

	/**
	 * "checked" reaches a check. "caller" takes the caller's Jwt and reaches
	 * no check, so only Liferay can refuse the caller, and only when the
	 * handler passes the Jwt on. "none" takes no Jwt and reaches no check.
	 */
	kind: 'caller' | 'checked' | 'none';
}

interface IMethod {
	body: string;
	params: string;
}

const CHECK = new RegExp(
	[
		String.raw`\b_(\w+(?:Permission|Validator))\.(\w+)\s*\(`,
		String.raw`\b(hasAccountMembership)\s*\(`,
		String.raw`\bthrow\s+new\s+(PrincipalException)\b`,
		String.raw`\b(_\w+)\s*\(`,
	].join('|'),
	'g'
);

const DECLARATION = /\b(?:private|protected|public)\b[^;{}()=]*?\b(\w+)\s*\(/g;

const HANDLER = /@\w+(?:\s*\([^()]*\))?|\b(\w+)\s*\(/g;

/**
 * Replaces the content of every comment, string, and character literal with
 * spaces, so that brackets inside them do not count and every index still
 * points at the same place in the source.
 */
export function mask(text: string): string {
	return text.replace(
		/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,
		(literal) =>
			literal[0] === '"' || literal[0] === "'"
				? literal[0] +
					' '.repeat(literal.length - 2) +
					literal[literal.length - 1]
				: literal.replace(/[^\n]/g, ' ')
	);
}

export class ClassAuth {
	constructor(masked: string) {
		this._masked = masked;

		DECLARATION.lastIndex = 0;

		let match: null | RegExpExecArray;

		while ((match = DECLARATION.exec(masked))) {
			const method = this._method(match.index + match[0].length - 1);

			if (!method) {
				continue;
			}

			const methods = this._methods.get(match[1]) ?? [];

			methods.push(method);

			this._methods.set(match[1], methods);
		}
	}

	/**
	 * Classifies the handler that the mapping annotation ending at `from`
	 * annotates.
	 */
	classify(from: number): IAuth {
		HANDLER.lastIndex = from;

		let match = HANDLER.exec(this._masked);

		// Skip the parameter annotations between the mapping and the name.

		while (match && !match[1]) {
			match = HANDLER.exec(this._masked);
		}

		const method = match
			? this._method(match.index + match[0].length - 1)
			: null;

		if (!method) {
			return {checks: [], jwt: false, kind: 'none'};
		}

		const checks = [...this._checks(method.body, new Set())].sort();

		const jwt = /\b(Jwt|Principal)\b/.test(method.params);

		return {
			checks,
			jwt,
			kind: checks.length ? 'checked' : jwt ? 'caller' : 'none',
		};
	}

	private _checks(body: string, visited: Set<string>): Set<string> {
		const checks = new Set<string>();

		for (const match of body.matchAll(CHECK)) {
			if (match[1]) {
				const close = _close(body, match.index + match[0].length - 1);

				const action = /ActionKeys\.(\w+)/.exec(
					body.slice(match.index, close)
				)?.[1];

				checks.add(
					`${match[1][0].toUpperCase()}${match[1].slice(1)}.${match[2]}${action ? ` ${action}` : ''}`
				);
			}
			else if (match[3] || match[4]) {
				checks.add(match[3] ?? match[4]);
			}
			else if (match[5] && !visited.has(match[5])) {
				visited.add(match[5]);

				for (const method of this._methods.get(match[5]) ?? []) {
					for (const check of this._checks(method.body, visited)) {
						checks.add(check);
					}
				}
			}
		}

		return checks;
	}

	/**
	 * Reads the parameters and the body of the method whose parameter list
	 * opens at `open`. Returns null for a method with no body.
	 */
	private _method(open: number): IMethod | null {
		const close = _close(this._masked, open);

		const rest = this._masked.slice(close);

		const brace = rest.search(/[{;]/);

		if (brace < 0 || rest[brace] === ';') {
			return null;
		}

		const start = close + brace;

		return {
			body: this._masked.slice(start, _close(this._masked, start)),
			params: this._masked.slice(open + 1, close - 1),
		};
	}

	private readonly _masked: string;
	private readonly _methods = new Map<string, IMethod[]>();
}

/**
 * Returns the index after the bracket that closes the one at `open`.
 */
function _close(masked: string, open: number): number {
	const opening = masked[open];
	const closing = opening === '(' ? ')' : '}';

	let depth = 0;

	for (let i = open; i < masked.length; i++) {
		if (masked[i] === opening) {
			depth++;
		}
		else if (masked[i] === closing && !--depth) {
			return i + 1;
		}
	}

	return masked.length;
}
