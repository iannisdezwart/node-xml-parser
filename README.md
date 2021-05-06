# node-xml-parser

Very simple and intuitive Node JS module that validates, parses and builds XML.

---

### Validating XML

```ts
import { validateXML } from 'node-xml-parser'

const goodXML = '<document><text>Hello, World</text><symbol data="!"/></document>'
const badXML = '</document><text Hello, World><!/></doc>'

// Yes, it's as easy as that:

validateXML(goodXML) // > true
validateXML(badXML) // > false
```

### Parsing XML

```ts
import { parseXML } from 'node-xml-parser'

const XML = '<document><text>Hello, World</text><symbol data="!"/></document>'

parseXML(XML)

/*
	Features clean, easily readable output:

	XMLNode {
		tag: 'document',
		attributes: Map(0) {},
		children: [
			XMLNode {
				tag: 'text',
				attributes: Map(0) {},
				children: [
					XMLNode {
						tag: '@text',
						attributes: Map(1) { data -> 'Hello, World' },
						children: []
					}
				]
			},
			XMLNode {
				tag: 'symbol',
				attributes: Map(1) { data -> '!' },
				children: []
			}
		]
	}
*/
```

### Building XML

```ts
import { buildXML, XMLNode } from 'node-xml-parser'

// Wow, so readable!

const xml = new XMLNode('document', {}, [
	new XMLNode('text', {}, [
		'Hello, World'
	]),
	'!'
])

buildXML(xml)

/*
	Prettiest output you have ever seen:

	<document>
		<text>
			Hello, World
		</text>
		!
	</document>
*/
```