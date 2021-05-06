export const whitespace = [ ' ', '\t', '\n', '\r' ]

export const isWhitespace = (char: string) => {
	for (const c of whitespace) if (c == char) return true
	return false
}

const charInRange = (char: string, lower: string, upper: string) => {
	const charCode = char.charCodeAt(0)
	const lowerCharCode = lower.charCodeAt(0)
	const upperCharCode = upper.charCodeAt(0)

	if (charCode < lowerCharCode || charCode > upperCharCode) return false
	return true
}

const charEquals = (char: string, test: string) => {
	return char.charCodeAt(0) == test.charCodeAt(0)
}

export const isValidTagStartChar = (char: string) => {
	if (
		charInRange(char, 'a', 'z') || charInRange(char, 'A', 'Z')
		|| charEquals(char, '_')
	) return true

	return false
}

export const isValidTagChar = (char: string) => {
	if (
		isValidTagStartChar(char) || charEquals(char, '-')
		|| charEquals(char, '.') || charInRange(char, '0', '9')
	) return true

	return false
}

export const isValidTag = (tag: string) => {
	return isValidTagStartChar(tag.charAt(0)) && isValidTagChar(tag.substr(1))
}

export const objToMap = (obj: { [ key: string ]: string }) => {
	const map = new Map<string, string>()

	for (const key in obj) {
		map.set(key, obj[key])
	}

	return map
}