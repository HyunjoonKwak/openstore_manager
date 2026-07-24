/**
 * Shared CSV helpers used by export/import server actions.
 */

// Leading characters that spreadsheet apps interpret as formulas
const FORMULA_PREFIX = /^[=+\-@\t\r]/

/**
 * Converts a value to a CSV-safe cell string.
 * Neutralizes spreadsheet formula injection by prefixing dangerous
 * leading characters with a single quote, then applies standard
 * CSV quoting (wrap in double quotes, escape embedded quotes).
 */
export function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? '')
  const neutralized = FORMULA_PREFIX.test(str) ? `'${str}` : str

  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }

  return neutralized
}

/**
 * Parses a single CSV line into cells.
 * Handles double-quoted fields containing commas and escaped ("") quotes.
 */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote inside a quoted field
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}
