/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * A small tokenizer for TypeScript and TSX. It is not a parser: it only knows
 * enough to keep strings, template literals, comments, regular expressions,
 * and JSX from confusing the bracket matching that the rest of the extractor
 * relies on. A JSX element becomes one token that records its tag names and
 * the tokens of the expressions inside it.
 */

export interface IToken {
	e: number;
	exprs?: IToken[][];
	inner?: IToken[];
	quasis?: string[];
	s: number;
	t: 'id' | 'jsx' | 'num' | 'p' | 're' | 'str' | 'tpl';
	tags?: string[];
	v: string;
}

const EXPRESSION_KEYWORDS = new Set([
	'case',
	'default',
	'delete',
	'do',
	'else',
	'in',
	'instanceof',
	'new',
	'of',
	'return',
	'throw',
	'typeof',
	'void',
	'yield',
	'await',
]);

const MULTI_PUNCTUATORS = ['...', '=>', '?.'];

const ID_START = /[A-Za-z_$]/;

const ID_PART = /[\w$]/;

export function tokenize(source: string, jsx: boolean): IToken[] {
	return new Tokenizer(source, jsx).run(0, false).tokens;
}

/**
 * Returns every token, with the tokens inside template literal expressions and
 * JSX elements spliced in after their parent.
 */
export function flatten(tokens: IToken[]): IToken[] {
	const flat: IToken[] = [];

	for (const token of tokens) {
		flat.push(token);

		if (token.exprs) {
			for (const expr of token.exprs) {
				flat.push(...flatten(expr));
			}
		}

		if (token.inner) {
			flat.push(...flatten(token.inner));
		}
	}

	return flat;
}

/**
 * Returns the index of the bracket that closes the one at `index`.
 */
export function matchBracket(tokens: IToken[], index: number): number {
	const open = tokens[index].v;
	const close = open === '(' ? ')' : open === '[' ? ']' : '}';

	let depth = 0;

	for (let i = index; i < tokens.length; i++) {
		if (tokens[i].t !== 'p') {
			continue;
		}

		if (tokens[i].v === open) {
			depth++;
		}
		else if (tokens[i].v === close) {
			depth--;

			if (depth === 0) {
				return i;
			}
		}
	}

	return tokens.length - 1;
}

class Tokenizer {
	jsx: boolean;
	pos = 0;
	source: string;

	constructor(source: string, jsx: boolean) {
		this.jsx = jsx;
		this.source = source;
	}

	run(start: number, stopAtBrace: boolean): {end: number; tokens: IToken[]} {
		const {source} = this;
		const tokens: IToken[] = [];

		let depth = 0;

		this.pos = start;

		while (this.pos < source.length) {
			const char = source[this.pos];
			const next = source[this.pos + 1];

			if (/\s/.test(char)) {
				this.pos++;

				continue;
			}

			if (char === '/' && next === '/') {
				const end = source.indexOf('\n', this.pos);

				this.pos = end < 0 ? source.length : end;

				continue;
			}

			if (char === '/' && next === '*') {
				const end = source.indexOf('*/', this.pos + 2);

				this.pos = end < 0 ? source.length : end + 2;

				continue;
			}

			const s = this.pos;
			const previous = tokens[tokens.length - 1];

			if (char === '"' || char === "'") {
				tokens.push({e: 0, s, t: 'str', v: this.readString(char)});
				tokens[tokens.length - 1].e = this.pos;

				continue;
			}

			if (char === '`') {
				tokens.push(this.readTemplate());

				continue;
			}

			if (ID_START.test(char)) {
				let end = this.pos + 1;

				while (end < source.length && ID_PART.test(source[end])) {
					end++;
				}

				tokens.push({e: end, s, t: 'id', v: source.slice(s, end)});

				this.pos = end;

				continue;
			}

			if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(next))) {
				const match = /^[0-9a-fA-FxXoObBn_.eE]+/.exec(
					source.slice(this.pos)
				)!;

				tokens.push({
					e: this.pos + match[0].length,
					s,
					t: 'num',
					v: match[0],
				});

				this.pos += match[0].length;

				continue;
			}

			if (char === '/' && _expressionPosition(previous)) {
				const end = this.readRegExp();

				if (end > 0) {
					tokens.push({e: end, s, t: 're', v: source.slice(s, end)});

					this.pos = end;

					continue;
				}
			}

			if (
				char === '<' &&
				this.jsx &&
				_expressionPosition(previous) &&
				(next === '>' || ID_START.test(next))
			) {
				const element = this.readJSX();

				if (element) {
					tokens.push(element);

					continue;
				}

				this.pos = s;
			}

			if (stopAtBrace) {
				if (char === '{') {
					depth++;
				}
				else if (char === '}') {
					if (depth === 0) {
						return {end: this.pos + 1, tokens};
					}

					depth--;
				}
			}

			const multi = MULTI_PUNCTUATORS.find((punctuator) =>
				source.startsWith(punctuator, this.pos)
			);

			const value = multi ?? char;

			tokens.push({e: this.pos + value.length, s, t: 'p', v: value});

			this.pos += value.length;
		}

		return {end: this.pos, tokens};
	}

	readString(quote: string): string {
		const {source} = this;

		let value = '';

		this.pos++;

		while (this.pos < source.length && source[this.pos] !== quote) {
			if (source[this.pos] === '\\') {
				value += source[this.pos + 1];

				this.pos += 2;

				continue;
			}

			if (source[this.pos] === '\n') {
				break;
			}

			value += source[this.pos++];
		}

		this.pos++;

		return value;
	}

	readTemplate(): IToken {
		const {source} = this;
		const s = this.pos;
		const quasis: string[] = [];
		const exprs: IToken[][] = [];

		let quasi = '';

		this.pos++;

		while (this.pos < source.length) {
			const char = source[this.pos];

			if (char === '\\') {
				quasi += source[this.pos + 1];

				this.pos += 2;

				continue;
			}

			if (char === '`') {
				this.pos++;

				break;
			}

			if (char === '$' && source[this.pos + 1] === '{') {
				quasis.push(quasi);

				quasi = '';

				const {end, tokens} = new Tokenizer(source, this.jsx).run(
					this.pos + 2,
					true
				);

				exprs.push(tokens);

				this.pos = end;

				continue;
			}

			quasi += char;

			this.pos++;
		}

		quasis.push(quasi);

		return {
			e: this.pos,
			exprs,
			quasis,
			s,
			t: 'tpl',
			v: source.slice(s, this.pos),
		};
	}

	readRegExp(): number {
		const {source} = this;

		let inClass = false;
		let i = this.pos + 1;

		while (i < source.length) {
			const char = source[i];

			if (char === '\n') {
				return -1;
			}

			if (char === '\\') {
				i += 2;

				continue;
			}

			if (char === '[') {
				inClass = true;
			}
			else if (char === ']') {
				inClass = false;
			}
			else if (char === '/' && !inClass) {
				i++;

				while (i < source.length && /[a-z]/.test(source[i])) {
					i++;
				}

				return i;
			}

			i++;
		}

		return -1;
	}

	/**
	 * Reads a JSX element starting at `<`. Returns null when the text is not
	 * JSX after all, for example a generic arrow function.
	 */
	readJSX(): IToken | null {
		const {source} = this;
		const s = this.pos;
		const tags: string[] = [];
		const inner: IToken[] = [];

		const readExpression = (): boolean => {
			const {end, tokens} = new Tokenizer(source, true).run(
				this.pos + 1,
				true
			);

			if (end > source.length) {
				return false;
			}

			inner.push(...tokens);

			this.pos = end;

			return true;
		};

		const readElement = (): boolean => {
			this.pos++;

			const tagMatch = /^[A-Za-z_$][\w$.:-]*/.exec(
				source.slice(this.pos)
			);

			const tag = tagMatch ? tagMatch[0] : '';

			if (tag) {
				tags.push(tag);
			}
			else if (source[this.pos] !== '>') {
				return false;
			}

			this.pos += tag.length;

			// Generic type arguments on a JSX tag are not supported. A tag
			// name followed by "," or "extends" is a generic arrow function.

			if (/^\s*(,|extends\b)/.test(source.slice(this.pos))) {
				return false;
			}

			while (this.pos < source.length) {
				const char = source[this.pos];

				if (/\s/.test(char)) {
					this.pos++;

					continue;
				}

				if (char === '/' && source[this.pos + 1] === '>') {
					this.pos += 2;

					return true;
				}

				if (char === '>') {
					this.pos++;

					break;
				}

				if (char === '{') {
					if (!readExpression()) {
						return false;
					}

					continue;
				}

				const attribute = /^[\w:-]+/.exec(source.slice(this.pos));

				if (!attribute) {
					return false;
				}

				this.pos += attribute[0].length;

				if (source[this.pos] === '=') {
					this.pos++;

					const quote = source[this.pos];

					if (quote === '"' || quote === "'") {
						const end = source.indexOf(quote, this.pos + 1);

						if (end < 0) {
							return false;
						}

						inner.push({
							e: end + 1,
							s: this.pos,
							t: 'str',
							v: source.slice(this.pos + 1, end),
						});

						this.pos = end + 1;
					}
					else if (quote === '{') {
						if (!readExpression()) {
							return false;
						}
					}
					else if (quote === '<') {
						if (!readElement()) {
							return false;
						}
					}
					else {
						return false;
					}
				}
			}

			while (this.pos < source.length) {
				const char = source[this.pos];

				if (char === '{') {
					if (!readExpression()) {
						return false;
					}

					continue;
				}

				if (char === '<') {
					if (source[this.pos + 1] === '/') {
						const end = source.indexOf('>', this.pos);

						if (end < 0) {
							return false;
						}

						const closing = source.slice(this.pos + 2, end).trim();

						if (closing !== tag) {
							return false;
						}

						this.pos = end + 1;

						return true;
					}

					if (!readElement()) {
						return false;
					}

					continue;
				}

				this.pos++;
			}

			return false;
		};

		if (!readElement()) {
			return null;
		}

		return {
			e: this.pos,
			inner,
			s,
			t: 'jsx',
			tags,
			v: tags[0] ?? '',
		};
	}
}

function _expressionPosition(previous: IToken | undefined): boolean {
	if (!previous) {
		return true;
	}

	if (previous.t === 'id') {
		return EXPRESSION_KEYWORDS.has(previous.v);
	}

	if (previous.t === 'p') {
		return ![')', ']', '}'].includes(previous.v);
	}

	return false;
}
