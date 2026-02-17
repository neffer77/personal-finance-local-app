import { ParserInterface } from './parser.interface'
import { chaseParser } from './chase.parser'

// Registry mapping issuer name → parser instance
const REGISTRY = new Map<string, ParserInterface>([
  ['chase', chaseParser],
])

export function getParserByIssuer(issuer: string): ParserInterface {
  const parser = REGISTRY.get(issuer.toLowerCase())
  if (!parser) {
    throw new Error(`No parser registered for issuer: "${issuer}"`)
  }
  return parser
}

export function detectParser(headers: string[]): ParserInterface | null {
  for (const parser of REGISTRY.values()) {
    if (parser.detectFormat(headers)) {
      return parser
    }
  }
  return null
}

export function registerParser(parser: ParserInterface): void {
  REGISTRY.set(parser.issuer.toLowerCase(), parser)
}
