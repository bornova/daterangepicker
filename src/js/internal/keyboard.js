import { DateTime } from 'luxon'

import { allCalendars, sideFromIndex } from './calendars.js'
import { clickDate } from './interactions.js'
import { updateCalendars, CALENDAR_ROWS, CALENDAR_COLS } from './rendering.js'
import { dismiss } from './dismiss.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Document-level keydown handler used while the picker is open. Translates arrow keys,
 * PageUp/PageDown, Enter, and Escape into navigation, selection, or dismissal.
 * @param {DateRangePicker} picker
 * @param {KeyboardEvent} e
 */
export function onKeyNav(picker, e) {
  if (!picker._isShowing) return
  if (!picker.container.contains(document.activeElement)) return
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return

  const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']

  if (!navKeys.includes(e.key) && e.key !== 'Enter' && e.key !== 'Escape') return

  if (e.key === 'Escape') {
    e.preventDefault()

    if (picker.options.closeOnEsc) {
      dismiss(picker)
    }

    return
  }

  e.preventDefault()

  if (!picker._focusedDate) {
    picker._focusedDate = picker.options.startDate ?? DateTime.now()
  }

  if (e.key === 'Enter') {
    selectFocused(picker)

    return
  }

  switch (e.key) {
    case 'ArrowLeft':
      picker._focusedDate = picker._focusedDate.minus({ days: 1 })
      break
    case 'ArrowRight':
      picker._focusedDate = picker._focusedDate.plus({ days: 1 })
      break
    case 'ArrowUp':
      picker._focusedDate = picker._focusedDate.minus({ weeks: 1 })
      break
    case 'ArrowDown':
      picker._focusedDate = picker._focusedDate.plus({ weeks: 1 })
      break
    case 'PageUp':
      picker._focusedDate = picker._focusedDate.minus({ months: 1 })
      break
    case 'PageDown':
      picker._focusedDate = picker._focusedDate.plus({ months: 1 })
      break
  }

  revealFocused(picker)
  updateCalendars(picker)
}

/** Simulates a click on the currently focused calendar date cell.
 *  @param {DateRangePicker} picker */
export function selectFocused(picker) {
  const fd = picker._focusedDate

  if (!fd) return

  const allCals = allCalendars(picker)

  for (let idx = 0; idx < allCals.length; idx++) {
    const calData = allCals[idx]

    if (!calData.calendar) continue

    for (let r = 0; r < CALENDAR_ROWS; r++) {
      for (let c = 0; c < CALENDAR_COLS; c++) {
        if (calData.calendar[r]?.[c]?.hasSame(fd, 'day')) {
          const cell =
            picker.container.querySelector(`[data-cal-index="${idx}"] [data-title="r${r}c${c}"]`) ??
            picker.container.querySelector(
              `.drp-calendar.${sideFromIndex(picker, idx) ?? 'left'} [data-title="r${r}c${c}"]`
            )

          if (cell?.classList.contains('available')) {
            clickDate(picker, { target: cell, stopPropagation: () => {} })
          }

          return
        }
      }
    }
  }
}

/** Shifts the visible calendar months so the focused date is in view.
 *  @param {DateRangePicker} picker */
export function revealFocused(picker) {
  const fd = picker._focusedDate

  if (!fd) return

  const allCals = allCalendars(picker)

  if (!allCals[0].month) return

  const fdYM = fd.toFormat('yyyy-MM')
  const visibleCals = picker.options.calendarCount === 1 ? [allCals[0]] : allCals

  if (visibleCals.some((c) => c.month?.toFormat('yyyy-MM') === fdYM)) return

  const firstMonth = allCals[0].month
  const lastVisibleIdx = visibleCals.length - 1
  const lastVisibleMonth = visibleCals[lastVisibleIdx].month

  if (fd < firstMonth.startOf('month')) {
    const months = Math.ceil(firstMonth.diff(fd, 'months').months)

    allCals[0].month = allCals[0].month.minus({ months })

    if (picker.options.syncCalendars || picker.options.calendarCount === 1) {
      for (let i = 1; i < allCals.length; i++) {
        allCals[i].month = allCals[0].month.plus({ months: i })
      }
    }
  } else if (picker.options.syncCalendars || picker.options.calendarCount === 1) {
    const months = Math.ceil(fd.diff(lastVisibleMonth, 'months').months)

    allCals[lastVisibleIdx].month = allCals[lastVisibleIdx].month.plus({ months })

    for (let i = 0; i < lastVisibleIdx; i++) {
      allCals[i].month = allCals[lastVisibleIdx].month.minus({ months: lastVisibleIdx - i })
    }

    for (let i = lastVisibleIdx + 1; i < allCals.length; i++) {
      allCals[i].month = allCals[lastVisibleIdx].month.plus({ months: i - lastVisibleIdx })
    }
  } else {
    allCals[allCals.length - 1].month = allCals[allCals.length - 1].month.set({ month: fd.month, year: fd.year })
  }
}
