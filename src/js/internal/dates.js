import { DateTime } from 'luxon'

import { to24h } from './helpers.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Converts a user-supplied date value to a Luxon `DateTime`.
 * Accepts a formatted string (parsed with `picker.options.locale.format`),
 * a native `Date`, or a `DateTime` passthrough.
 * @param {DateRangePicker} picker
 * @param {string|Date|object} val
 * @returns {object|null} Luxon `DateTime`, or `null` if the input is unrecognised.
 */
export function parseDateTime(picker, val) {
  if (typeof val === 'string') return DateTime.fromFormat(val, picker.options.locale.format)
  if (val instanceof DateTime) return val
  if (val instanceof Date) return DateTime.fromJSDate(val)

  return null
}

/**
 * Formats the current start/end selection as a single string using `locale.format` and `locale.separator`.
 * Returns an empty string when `startDate` is `null`.
 * @param {DateRangePicker} picker
 * @returns {string}
 */
export function formatRange(picker) {
  const { options } = picker
  if (!options.startDate) return ''
  if (options.singleDatePicker) return options.startDate.toFormat(options.locale.format)
  if (!options.endDate) return options.startDate.toFormat(options.locale.format)

  return `${options.startDate.toFormat(options.locale.format)}${options.locale.separator}${options.endDate.toFormat(options.locale.format)}`
}

/**
 * Reads dates pre-filled in the attached `<input>` element when no `startDate` option was
 * provided. Sets `startDate` and `endDate` if a valid value is found.
 * @param {DateRangePicker} picker
 * @param {object} options
 * @returns {boolean} Whether dates were successfully read from the input.
 */
export function readInputDates(picker, options) {
  if (options.startDate != null || options.endDate != null) return false
  if (!picker.element.matches('input[type="text"], input:not([type])')) return false

  const val = picker.element.value
  const split = val.split(picker.options.locale.separator)

  let start = null
  let end = null

  if (split.length === 2) {
    start = DateTime.fromFormat(split[0], picker.options.locale.format)
    end = DateTime.fromFormat(split[1], picker.options.locale.format)
  } else if (picker.options.singleDatePicker && val !== '') {
    start = end = DateTime.fromFormat(val, picker.options.locale.format)
  }

  if (start !== null && end !== null && start.isValid && end.isValid) {
    picker.setStartDate(start)
    picker.setEndDate(end)

    return true
  }

  return false
}

/**
 * Reads the current hour/minute/second values from the time picker dropdowns on one side.
 * Handles 12/24-hour conversion and falls back gracefully if the minute select has no valid value.
 * @param {DateRangePicker} picker
 * @param {'left'|'right'} side
 * @returns {{ hour: number, minute: number, second: number }}
 */
export function readTime(picker, side) {
  const timeRoot =
    picker.container.querySelector(`.drp-time-row .calendar-time.${side}`) ??
    picker.container.querySelector(`.drp-calendar.${side} .calendar-time`)

  if (!timeRoot) return { hour: 0, minute: 0, second: 0 }

  const hourEl = timeRoot.querySelector('.hourselect')
  const minuteEl = timeRoot.querySelector('.minuteselect')

  if (!hourEl || !minuteEl) return { hour: 0, minute: 0, second: 0 }

  let hour = parseInt(hourEl.value, 10)
  let minute = parseInt(minuteEl.value, 10)

  if (isNaN(minute)) {
    const opts = minuteEl.querySelectorAll('option')

    minute = parseInt(opts[opts.length - 1].value, 10)
  }

  const secondEl = timeRoot.querySelector('.secondselect')
  const second = picker.options.timePickerSeconds && secondEl ? parseInt(secondEl.value, 10) : 0

  if (!picker.options.timePicker24Hour) {
    const ampmEl = timeRoot.querySelector('.ampmselect')
    const ampm = ampmEl ? ampmEl.value : 'AM'

    hour = to24h(hour, ampm === 'PM')
  }

  return { hour, minute, second }
}

/**
 * Snaps a `DateTime`'s minutes to the nearest `minuteIncrement` boundary.
 * @param {DateRangePicker} picker
 * @param {object} dt Luxon `DateTime`
 * @param {(n: number) => number} [fn=Math.round] Rounding function (`Math.floor`/`Math.ceil` to clamp direction).
 * @returns {object} Adjusted `DateTime` (or the original when `minuteIncrement` is falsy).
 */
export function snapMinute(picker, dt, fn = Math.round) {
  if (!picker.options.minuteIncrement) return dt

  return dt.set({ minute: fn(dt.minute / picker.options.minuteIncrement) * picker.options.minuteIncrement })
}
