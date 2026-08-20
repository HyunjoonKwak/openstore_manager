/**
 * Claude has no `response_format: json_object` equivalent, so a reply asked
 * for as JSON may still arrive wrapped in a code fence or behind a lead-in
 * sentence. These helpers normalise that; keep them free of runtime imports
 * so they stay unit-testable.
 */

export const JSON_ONLY_INSTRUCTION =
  'Respond with a single valid JSON object and nothing else. ' +
  'No markdown code fences, no explanation before or after the JSON.'

export class AiJsonParseError extends Error {
  // Explicit field, not a parameter property — node --test's type stripper
  // rejects the latter
  readonly reply: string

  constructor(reply: string) {
    super('AI 응답을 JSON으로 해석하지 못했습니다.')
    this.name = 'AiJsonParseError'
    this.reply = reply
  }
}

export function parseJsonReply<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : text).trim()

  try {
    return JSON.parse(candidate) as T
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T
      } catch {
        // fall through to the shared error below
      }
    }
    throw new AiJsonParseError(text.slice(0, 500))
  }
}
