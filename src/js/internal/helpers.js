import { Info } from 'luxon'

/**
 * Decodes HTML entities in a string by routing it through a temporary `<textarea>`.
 * @param {string} str
 * @returns {string}
 */
export function decodeHtml(str) {
  const ta = document.createElement('textarea')

  ta.innerHTML = str

  return ta.value
}

/**
 * Escapes `&`, `<`, `>`, and `"` for safe HTML attribute and text content insertion.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Reads `data-*` attributes from an element and coerces their string values to
 * booleans or numbers where appropriate, returning a plain options object.
 * @param {Element} el
 * @returns {object}
 */
export function getDataAttributes(el) {
  if (!el?.dataset) return {}

  return Object.fromEntries(
    Object.entries(el.dataset).map(([key, val]) => {
      if (val === 'true') return [key, true]
      if (val === 'false') return [key, false]
      if (val !== '' && !isNaN(val)) return [key, Number(val)]

      return [key, val]
    })
  )
}

/**
 * First day of the week: `0` = Sunday … `6` = Saturday.
 * Luxon's `Info.getStartOfWeek()` returns ISO weekday (1 = Mon … 7 = Sun); `% 7` maps Sun → 0.
 * @returns {number}
 */
export function getFirstDayOfWeek() {
  try {
    return Info.getStartOfWeek() % 7
  } catch {
    return 0
  }
}

/**
 * Derives the locale's short date format string using `Intl`, expressed in Luxon token syntax.
 * Falls back to `'MM/dd/yyyy'` if `Intl.DateTimeFormat` is unavailable.
 * @returns {string}
 */
export function getLocaleDateFormat() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date(2001, 11, 31)) // Dec 31 — unambiguous

    return parts
      .map(({ type, value }) => {
        if (type === 'year') return 'yyyy'
        if (type === 'month') return 'MM'
        if (type === 'day') return 'dd'

        return value // separator
      })
      .join('')
  } catch {
    return 'MM/dd/yyyy'
  }
}

/**
 * Short month names (Jan–Dec) in the current locale.
 * @returns {string[]}
 */
export function getMonthsShort() {
  return Info.months('short')
}

/**
 * Short weekday names in Sun–Sat order.
 * Luxon's `Info.weekdays()` uses ISO order (Mon–Sun), so we rotate by one position.
 * @returns {string[]}
 */
export function getWeekdaysMin() {
  const iso = Info.weekdays('short').map((d) => d.slice(0, 2)) // ['Mo', 'Tu', …, 'Su']

  return [iso[6], ...iso.slice(0, 6)] // rotate: ['Su', 'Mo', …, 'Sa']
}

/**
 * Converts a 12-hour display value (1–12) and AM/PM flag to a 24-hour value (0–23).
 * @param {number} h12
 * @param {boolean} isPm
 * @returns {number}
 */
export function to24h(h12, isPm) {
  return isPm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12
}

/**
 * Adds whitespace-separated CSS classes from a string (or array) to an element. Empty
 * tokens are ignored. No-op when `el` or `classes` is falsy.
 * @param {Element} el
 * @param {string|string[]} classes
 */
export function addClasses(el, classes) {
  if (!el || !classes) return

  const list = Array.isArray(classes) ? classes : String(classes).split(/\s+/)
  const filtered = list.filter(Boolean)

  if (filtered.length) el.classList.add(...filtered)
}
