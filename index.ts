import * as fs from 'fs'
import { isWhitespace, whitespace } from './util'

interface XMLNodeAttribute {
	key: string
	value: string
}

export class XMLNode {
	tag: string
	attributes: Map<string, string>
	children: XMLNode[]
	text: string[]

	constructor(tag: string, attributes: Map<string, string>) {
		this.tag = tag
		this.attributes = attributes
		this.children = []
		this.text = []
	}

	appendChild(node: XMLNode) {
		this.children.push(node)
	}

	appendText(text: string) {
		const node = new XMLNode('@text', new Map<string, string>([ [ 'data', text ] ]))
		this.children.push(node)
	}

	dfs(
		beforeCallback: (node: XMLNode, depth: number) => void,
		afterCallback: (node: XMLNode, depth: number) => void,
		depth: number
	) {
		beforeCallback(this, depth)

		for (const child of this.children) {
			child.dfs(beforeCallback, afterCallback, depth + 1)
		}

		afterCallback(this, depth)
	}
}

export class XMLParser {
	xml: string
	i: number
	nodes: XMLNode[]

	constructor(xml: string) {
		this.xml = xml
		this.i = 0
		this.nodes = []
	}

	lastNode() {
		return this.nodes[this.nodes.length - 1]
	}

	getChar() {
		if (this.i >= this.xml.length) {
			throw new Error(`Unexpected EOF.`)
		}

		return this.xml[this.i++]
	}

	peekChars(offset = 0, size = 1) {
		return this.xml.substr(this.i + offset, size)
	}

	assertChar(char: string, expected: string[]) {
		for (const option of expected) {
			if (char == option) return
		}

		throw new Error(`Unexpected character '${ char }' at position ${ this.i }. Expected any of [ ${ expected.map(c => `'${ c }'`).join(', ') } ].`)
	}

	addNode(tag: string, attributes: Map<string, string>) {
		const newNode = new XMLNode(tag, attributes)
		if (this.nodes.length > 0) this.lastNode().children.push(newNode)
		this.nodes.push(newNode)
	}

	popNode() {
		return this.nodes.pop()
	}

	parse() {
		while (true) {
			let char = this.getChar()
			if (isWhitespace(char)) continue

			if (char != '<') {
				this.lastNode().appendText(this.matchText())
				char = this.getChar()
			}

			if (this.peekChars(0, 3) == '!--') {
				this.i += 3
				this.matchCommentEnd()
			}

			if (this.peekChars(0, 8) == '![CDATA[') {
				this.i += 8
				this.lastNode().appendText(this.matchCDataText())
				continue
			}

			const nextChar = this.peekChars(0, 1)

			if (nextChar == '/') {
				this.i++
				const node = this.matchNodeEndTag()

				if (this.nodes.length == 0) {
					return node
				}
			} else {
				this.matchNodeStartTag()
			}
		}
	}

	matchUntilChar(chars: string[]) {
		let str = ''

		while (true) {
			const c = this.peekChars(0, 1)

			for (const char of chars) {
				if (c == char) {
					return str
				}
			}

			this.i++
			str += c
		}
	}

	matchUntilString(str: string) {
		const index = this.xml.indexOf(str, this.i)
		if (index == -1) throw new Error(`Unexpected EOF.`)
		const found = this.xml.substring(this.i, index)

		this.i = index + str.length
		return found
	}

	matchCommentEnd() {
		while (true) {
			const char = this.getChar()

			if (char == '-' && this.peekChars(0, 2) == '->') {
				this.i += 2
				return
			}
		}
	}

	matchNodeStartTag() {
		if (this.peekChars(0, 1) == '/') {
			throw new Error(`Unexpected closing tag at position ${ this.i }.`)
		}

		const tag = this.matchUntilChar([ ...whitespace, '/', '>' ])
		const nextChar = this.getChar()
		let attributes: Map<string, string>

		if (isWhitespace(nextChar)) {
			attributes = this.matchAttributes()
		} else {
			attributes = new Map<string, string>()
		}

		this.addNode(tag, attributes)

		const endStartTagChar = this.getChar()

		if (endStartTagChar == '/') {
			this.assertChar(this.getChar(), [ '>' ])
			this.popNode()
		} else {
			this.assertChar(endStartTagChar, [ '>' ])
		}
	}

	matchAttributes() {
		const attributes = new Map<string, string>()

		while (true) {
			const char = this.peekChars(0, 1)

			if (char == '/' || char == '>') {
				return attributes
			}

			if (isWhitespace(char)) {
				this.i++
				continue
			}

			const attribute = this.matchAttribute()
			attributes.set(attribute.key, attribute.value)
		}
	}

	matchAttribute(): XMLNodeAttribute {
		const key = this.matchUntilChar([ ...whitespace, '=' ])
		this.matchUntilChar([ '=' ])
		this.i++

		this.matchUntilChar([ '"' ])
		this.i++
		const value = this.matchUntilChar([ '"' ])
		this.i++

		return { key, value }
	}

	matchNodeEndTag() {
		while (true) {
			const char = this.peekChars(0, 1)

			if (isWhitespace(char)) {
				this.i++
				continue
			}

			const tag = this.matchUntilChar([ ...whitespace, '>' ])
			this.matchUntilChar([ '>' ])
			this.i++

			if (tag != this.lastNode().tag) {
				throw new Error(`Unexpected closing tag for node '${ tag }' at position ${ this.i }. Expected a closing tag for node '${ this.lastNode().tag }'`)
			}

			return this.popNode()
		}
	}

	matchText() {
		return this.matchUntilChar([ '<' ])
	}

	matchCDataText() {
		return this.matchUntilString(']]>')
	}
}

interface XMLBuilderOptions {
	indentationSize?: number
	indentationType?: 'tabs' | 'spaces'
	seperator?: string
	enableSelfClosingTags?: boolean
}

export class XMLBuilder {
	root: XMLNode
	options: XMLBuilderOptions

	constructor(root: XMLNode, options: XMLBuilderOptions = {}) {
		this.root = root
		this.options = {
			indentationSize: 1,
			indentationType: 'tabs',
			seperator: '\n',
			enableSelfClosingTags: true,
			...options
		}
	}

	indentation(depth: number) {
		return (this.options.indentationType == 'tabs' ? '\t' : ' ').repeat(depth)
	}

	build() {
		let res = ''

		this.root.dfs(
			(node, depth) => {
				if (node.tag == '@text') {
					res += `${ this.indentation(depth) }${ node.attributes.get('data') }${ this.options.seperator }`
					return
				}

				res += `${ this.indentation(depth) }<${ node.tag }`

				for (const [ key, value ] of node.attributes) {
					res += ` ${ key }="${ value }"`
				}

				if (node.children.length == 0) {
					res += '/'
				}

				res += `>${ this.options.seperator }`
			},
			(node, depth) => {
				if (node.tag == '@text') {
					return
				}

				if (node.children.length == 0) {
					return
				}

				res += `${ this.indentation(depth) }</${ node.tag }>${ this.options.seperator }`
			},
			0
		)

		return res
	}
}