import { DateTime } from 'luxon'

import { updateView } from './rendering.js'
import { dismiss } from './dismiss.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/** Common date formats tried after the configured `locale.format` when parsing input. */
const FALLBACK_FORMATS = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'M/d/yyyy', 'dd.MM.yyyy']

/**
 * Parses a value typed directly into the attached input and updates the selection.
 * Tries `picker.options.locale.format` first, then a list of common fallback formats.
 * Ignores Escape keypresses and empty values.
 * @param {DateRangePicker} picker
 * @param {KeyboardEvent} [e]
 */
export function parseInput(picker, e) {
  if (e?.key === 'Escape') return

  if (!picker.element.matches('input') || !picker.element.value.length) return

  const tryParse = (str) => {
    const trimmed = str.trim()
    const primary = DateTime.fromFormat(trimmed, picker.options.locale.format)

    if (primary.isValid) return primary

    for (const fmt of FALLBACK_FORMATS) {
      const dt = DateTime.fromFormat(trimmed, fmt)

      if (dt.isValid) return dt
    }

    return null
  }

  const parts = picker.element.value.split(picker.options.locale.separator)
  let start, end

  if (parts.length === 2) {
    start = tryParse(parts[0])
    end = tryParse(parts[1])
  } else if (picker.options.singleDatePicker) {
    start = end = tryParse(picker.element.value)
  } else {
    return
  }

  if (!start || !end) return

  picker.setStartDate(start)
  picker.setEndDate(end)

  updateView(picker)
}

/**
 * Handles keyboard events on the attached element:
 * Tab/Enter parse and close the picker; Escape dismisses when `closeOnEsc` is set.
 * @param {DateRangePicker} picker
 * @param {KeyboardEvent} e
 */
export function onElementKey(picker, e) {
  if (e.key === 'Tab' || e.key === 'Enter') {
    parseInput(picker)
    picker.hide()
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()

    if (picker.options.closeOnEsc) {
      dismiss(picker)
    }
  }
}
