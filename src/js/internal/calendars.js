/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Returns all calendar state objects in display order: `[left, ...middle, right]`.
 * @param {DateRangePicker} picker
 * @returns {object[]}
 */
export function allCalendars(picker) {
  return [picker._leftCalendar, ...picker._extraCalendars, picker._rightCalendar]
}

/**
 * Returns the calendar state object at the given index (`0` = left, `N-1` = right).
 * @param {DateRangePicker} picker
 * @param {number} idx
 * @returns {object}
 */
export function calendarAt(picker, idx) {
  return allCalendars(picker)[idx]
}

/**
 * Returns `'left'` for the first calendar, `'right'` for the last, and `null` for any
 * middle calendar. Useful for DOM lookups that key off the legacy `.left`/`.right` classes.
 * @param {DateRangePicker} picker
 * @param {number} idx
 * @returns {'left'|'right'|null}
 */
export function sideFromIndex(picker, idx) {
  if (idx === 0) return 'left'
  if (idx === allCalendars(picker).length - 1) return 'right'

  return null
}

/**
 * Clamps every calendar's visible month into `[minDate, maxDate]` (inclusive at the
 * month level). When the first calendar would fall before `minDate`, all calendars
 * shift forward; when the last calendar would fall past `maxDate`, all calendars
 * shift backward. No-op when neither bound is set.
 * @param {DateRangePicker} picker
 */
export function clampCalendarMonths(picker) {
  const allCals = allCalendars(picker)
  const { minDate, maxDate } = picker.options

  if (minDate) {
    const minYM = minDate.toFormat('yyyy-MM')

    if (allCals[0].month.toFormat('yyyy-MM') < minYM) {
      allCals.forEach((c, i) => {
        c.month = minDate.set({ day: 2 }).plus({ months: i })
      })
    }
  }

  if (maxDate) {
    const maxYM = maxDate.toFormat('yyyy-MM')
    const last = allCals[allCals.length - 1]

    if (last.month.toFormat('yyyy-MM') > maxYM) {
      allCals.forEach((c, i) => {
        c.month = maxDate.set({ day: 2 }).minus({ months: allCals.length - 1 - i })
      })
    }
  }
}

/**
 * Reads `data-cal-index` from a calendar DOM element, falling back to class-based detection.
 * @param {DateRangePicker} picker
 * @param {Element} calEl
 * @returns {number}
 */
export function calendarIndex(picker, calEl) {
  if (calEl.dataset.calIndex !== undefined) return parseInt(calEl.dataset.calIndex, 10)

  return calEl.classList.contains('left') ? 0 : allCalendars(picker).length - 1
}

/**
 * Resolves the Luxon `DateTime` represented by a calendar `<div>` cell
 * using its `data-title` attribute and the calendar side it belongs to.
 * @param {DateRangePicker} picker
 * @param {Element} target
 * @returns {object|null}
 */
export function dateFromCell(picker, target) {
  const title = target.getAttribute('data-title')
  const cal = target.closest('.drp-calendar')

  if (!cal || !title) return null

  return calendarAt(picker, calendarIndex(picker, cal)).calendar[title[1]]?.[title[3]] ?? null
}
