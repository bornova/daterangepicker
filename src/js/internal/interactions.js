import { allCalendars, calendarAt, calendarIndex, dateFromCell, sideFromIndex } from './calendars.js'
import { readTime } from './dates.js'
import { showCalendars, hideCalendars } from './positioning.js'
import { updateCalendars, updateView, updateSelected, updateApplyButton, renderTimePicker } from './rendering.js'
import { markChosenLabel, commit, trigger } from './commit.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/** Handles a click on the Previous Month arrow.
 *  @param {DateRangePicker} picker
 *  @param {Event} e */
export function clickPrev(picker, e) {
  if (picker.options.syncCalendars || picker.options.calendarCount === 1) {
    allCalendars(picker).forEach((c) => {
      c.month = c.month.minus({ months: 1 })
    })
  } else {
    const cal = e.target.closest('.drp-calendar')
    const idx = calendarIndex(picker, cal)
    const newMonth = calendarAt(picker, idx).month.minus({ months: 1 })

    if (idx > 0 && newMonth.toFormat('yyyy-MM') <= calendarAt(picker, idx - 1).month.toFormat('yyyy-MM')) return

    calendarAt(picker, idx).month = newMonth
  }

  updateCalendars(picker)
}

/** Handles a click on the Next Month arrow.
 *  @param {DateRangePicker} picker
 *  @param {Event} e */
export function clickNext(picker, e) {
  if (picker.options.syncCalendars || picker.options.calendarCount === 1) {
    allCalendars(picker).forEach((c) => {
      c.month = c.month.plus({ months: 1 })
    })
  } else {
    const cal = e.target.closest('.drp-calendar')
    const idx = calendarIndex(picker, cal)
    const allCals = allCalendars(picker)
    const newMonth = allCals[idx].month.plus({ months: 1 })

    if (idx < allCals.length - 1 && newMonth.toFormat('yyyy-MM') >= allCals[idx + 1].month.toFormat('yyyy-MM')) return

    allCals[idx].month = newMonth
  }

  updateCalendars(picker)
}

/** Handles a click on a predefined range label.
 *  @param {DateRangePicker} picker
 *  @param {Event} e */
export function clickRange(picker, e) {
  const label = e.target.getAttribute('data-range-key')

  picker._state.chosenLabel = label

  if (label === picker.options.locale.customRangeLabel) {
    picker._state.customRangeSelected = true
    picker.container.querySelectorAll('.drp-ranges li').forEach((el) => el.classList.remove('active'))
    e.target.classList.add('active')
    showCalendars(picker)
  } else {
    picker._state.customRangeSelected = false
    let [start, end] = picker.options.ranges[label]

    if (!picker.options.showTimePicker) {
      start = start.startOf('day')
      end = end.endOf('day')
    }

    picker.options.startDate = start
    picker.options.endDate = end

    if (!picker.options.alwaysShowCalendars) {
      hideCalendars(picker)
    }

    clickApply(picker)
  }
}

/** Handles a click on a calendar day cell.
 *  @param {DateRangePicker} picker
 *  @param {{ target: Element, stopPropagation: Function }} e */
export function clickDate(picker, e) {
  if (!e.target.classList.contains('available') && !e.target.classList.contains('out-of-span')) return

  let date = dateFromCell(picker, e.target)

  if (!date) return

  picker._state.focusedDate = date

  const withinMinSpan =
    !picker.options.endDate &&
    picker.options.startDate &&
    picker.options.minDuration &&
    date > picker.options.startDate &&
    date <
      picker.options.startDate.plus({
        days: picker.options.inclusiveDuration ? picker.options.minDuration - 1 : picker.options.minDuration
      })

  if (
    picker.options.endDate ||
    !picker.options.startDate ||
    date.startOf('day') < picker.options.startDate.startOf('day') ||
    withinMinSpan
  ) {
    if (picker.options.showTimePicker) {
      const { hour, minute, second } = readTime(picker, 'left')

      date = date.set({ hour, minute, second })
    }

    picker.options.endDate = null
    picker.setStartDate(date)
  } else if (!picker.options.endDate && date < picker.options.startDate) {
    picker.setEndDate(picker.options.startDate)
  } else {
    if (picker.options.showTimePicker) {
      const { hour, minute, second } = readTime(picker, 'right')

      date = date.set({ hour, minute, second })
    }

    picker.setEndDate(date)

    picker._state.focusedDate = picker.options.startDate

    if (picker.options.autoApply) {
      markChosenLabel(picker)
      clickApply(picker)
    }
  }

  if (picker.options.singleDatePicker) {
    picker.setEndDate(picker.options.startDate)

    if (picker.options.autoApply) {
      clickApply(picker)
    }
  }

  updateView(picker)

  e.stopPropagation()
}

/** Highlights the in-range cells while the user hovers over a day.
 *  @param {DateRangePicker} picker
 *  @param {{ target: Element }} e */
export function hoverDate(picker, e) {
  if (!picker.options.endDate && picker.options.startDate) {
    const date = dateFromCell(picker, e.target)

    if (!date) return

    const startDate = picker.options.startDate

    allCalendars(picker).forEach((calData, idx) => {
      if (!calData.calendar) return

      const calEl =
        picker.container.querySelector(`[data-cal-index="${idx}"]`) ??
        picker.container.querySelector(`.drp-calendar.${sideFromIndex(picker, idx) ?? 'left'}`)

      if (!calEl) return

      calEl.querySelectorAll('.calendar-cell:not(.week)').forEach((el) => {
        const t = el.getAttribute('data-title')
        const dt = calData.calendar[t[1]]?.[t[3]]

        if (!dt) return

        el.classList.toggle('in-range', date > startDate && ((dt > startDate && dt < date) || dt.hasSame(date, 'day')))
      })
    })

    if (!picker.options.singleDatePicker) {
      const hoverEnd = date > startDate ? date : startDate
      const hoverStart = date > startDate ? startDate : date

      if (picker.options.showSelectedDates) {
        const selectedEl = picker.container.querySelector('.drp-selected')

        if (selectedEl) {
          selectedEl.innerHTML = `${hoverStart.toFormat(picker.options.locale.format)}${picker.options.locale.separator}${hoverEnd.toFormat(picker.options.locale.format)}`
        }
      }

      const durEl = picker.container.querySelector('.drp-duration')

      if (durEl && picker.options.showDuration && picker.options.durationFormat) {
        const durEnd =
          picker.options.inclusiveDuration && !picker.options.showTimePicker ? hoverEnd.plus({ days: 1 }) : hoverEnd

        durEl.textContent = durEnd
          .diff(hoverStart, ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'])
          .toFormat(picker.options.durationFormat)
      }
    }
  }
}

/**
 * Applies the current selection and fires `apply`. Hides the picker when `closeOnApply` is set,
 * otherwise commits in place and keeps the picker open.
 * @param {DateRangePicker} picker
 */
export function clickApply(picker) {
  const oldStartDate = picker._state.oldStartDate
  const oldEndDate = picker._state.oldEndDate

  picker._state.openedWithEmptyInput = false
  picker._state.customRangeSelected = false
  picker._state.hasPendingUnappliedSelection = false

  trigger(picker, 'apply', {
    startDate: picker.options.startDate,
    endDate: picker.options.endDate,
    chosenLabel: picker._state.chosenLabel
  })

  if (picker.options.closeOnApply) {
    picker._state.commitOnHide = true
    picker.hide()
  } else {
    picker._state.oldStartDate = picker.options.startDate
    picker._state.oldEndDate = picker.options.endDate

    commit(picker, oldStartDate ?? null, oldEndDate ?? null, 'apply', {
      callbackOnChangedOnly: false
    })
  }
}

/**
 * Reverts the selection to the values saved when the picker opened, restores the original
 * input value, and fires `cancel`. Hides the picker when `closeOnCancel` is set.
 * @param {DateRangePicker} picker
 */
export function clickCancel(picker) {
  picker.options.startDate = picker._state.oldStartDate
  picker.options.endDate = picker._state.oldEndDate
  picker._state.hasPendingUnappliedSelection = false

  const shouldRestoreInput = picker.options.autoUpdateInput && picker.element.matches('input')
  const oldInputValue = picker._state.oldInputValue ?? ''

  if (picker.options.closeOnCancel) {
    if (picker._state.openedWithEmptyInput) {
      const prev = picker.options.autoUpdateInput

      picker.options.autoUpdateInput = false
      picker.hide()
      picker.options.autoUpdateInput = prev

      if (picker.element.matches('input')) {
        picker.element.value = ''
      }
    } else {
      picker.hide()
    }
  } else {
    updateView(picker)
  }

  if (shouldRestoreInput && picker.element.value !== oldInputValue) {
    picker.element.value = oldInputValue
    picker.element.dispatchEvent(new Event('input', { bubbles: true }))
  }

  trigger(picker, 'cancel', { startDate: picker.options.startDate, endDate: picker.options.endDate })
}

/**
 * Clears the attached input, resets in-picker selection to `null`, hides the picker,
 * and fires `clear`.
 * @param {DateRangePicker} picker
 */
export function clickClear(picker) {
  picker.options.startDate = null
  picker.options.endDate = null
  picker._state.focusedDate = null

  if (picker.options.showTimePicker) {
    picker.container.querySelectorAll('.calendar-time').forEach((el) => {
      el.innerHTML = ''
    })
  }

  const prev = picker.options.autoUpdateInput

  picker.options.autoUpdateInput = false
  picker._state.commitOnHide = false
  picker._state.skipCommitOnHide = true
  picker._state.hasPendingUnappliedSelection = false
  picker.hide()
  picker.options.autoUpdateInput = prev

  if (picker.element.matches('input')) {
    picker.element.value = ''
    picker.element.dispatchEvent(new Event('input', { bubbles: true }))
  }

  trigger(picker, 'clear', {})
}

/**
 * Handles month/year dropdown changes, applying min/max/start clamping before re-rendering.
 * @param {DateRangePicker} picker
 * @param {Event} e
 */
export function changeMonthOrYear(picker, e) {
  const syncCalendars = picker.options.syncCalendars || picker.options.calendarCount === 1
  const calEl = e.target.closest('.drp-calendar')
  const idx = calendarIndex(picker, calEl)
  const isFirst = idx === 0

  let month = parseInt(calEl.querySelector('.monthselect').value, 10)
  let year = parseInt(calEl.querySelector('.yearselect').value, 10)

  if (!isFirst && picker.options.startDate) {
    if (
      year < picker.options.startDate.year ||
      (year === picker.options.startDate.year && month < picker.options.startDate.month - 1)
    ) {
      month = picker.options.startDate.month - 1
      year = picker.options.startDate.year
    }
  }

  if (picker.options.minDate) {
    if (
      year < picker.options.minDate.year ||
      (year === picker.options.minDate.year && month < picker.options.minDate.month - 1)
    ) {
      month = picker.options.minDate.month - 1
      year = picker.options.minDate.year
    }
  }

  if (picker.options.maxDate) {
    if (
      year > picker.options.maxDate.year ||
      (year === picker.options.maxDate.year && month > picker.options.maxDate.month - 1)
    ) {
      month = picker.options.maxDate.month - 1
      year = picker.options.maxDate.year
    }
  }

  const allCals = allCalendars(picker)

  if (!syncCalendars) {
    let candidate = allCals[idx].month.set({ month: month + 1, year })
    const prevCal = allCals[idx - 1]
    const nextCal = allCals[idx + 1]

    if (prevCal && candidate.toFormat('yyyy-MM') <= prevCal.month.toFormat('yyyy-MM')) {
      candidate = prevCal.month.plus({ months: 1 })
    }

    if (nextCal && candidate.toFormat('yyyy-MM') >= nextCal.month.toFormat('yyyy-MM')) {
      candidate = nextCal.month.minus({ months: 1 })
    }

    month = candidate.month - 1
    year = candidate.year
  }

  allCals[idx].month = allCals[idx].month.set({ month: month + 1, year })

  if (syncCalendars) {
    const newLeftMonth = allCals[idx].month.minus({ months: idx })

    for (let i = 0; i < allCals.length; i++) {
      allCals[i].month = newLeftMonth.plus({ months: i })
    }
  }

  updateCalendars(picker)
}

/**
 * Handles time picker dropdown changes (hour/minute/second/AM–PM) and updates the selection.
 * @param {DateRangePicker} picker
 * @param {Event} e
 */
export function changeTime(picker, e) {
  const timeWrap = e.target.closest('.calendar-time')
  const calWrap = e.target.closest('.drp-calendar')
  const isLeft = timeWrap?.classList.contains('left') ?? calWrap?.classList.contains('left') ?? false
  const side = isLeft ? 'left' : 'right'
  const focusClass = ['hourselect', 'minuteselect', 'secondselect', 'ampmselect'].find((cls) =>
    e.target.classList.contains(cls)
  )
  const { hour, minute, second } = readTime(picker, side)

  if (isLeft) {
    if (!picker.options.startDate) return

    const start = picker.options.startDate.set({ hour, minute, second })

    picker.setStartDate(start)

    if (picker.options.singleDatePicker) {
      picker.options.endDate = picker.options.startDate
    } else if (
      picker.options.endDate &&
      picker.options.endDate.hasSame(start, 'day') &&
      picker.options.endDate < start
    ) {
      picker.setEndDate(start)
    }
  } else if (picker.options.endDate) {
    picker.setEndDate(picker.options.endDate.set({ hour, minute, second }))
  }

  updateCalendars(picker)
  updateApplyButton(picker)

  if (picker.options.endDate) {
    updateSelected(picker)
  }

  if (picker.options.autoApply && picker.options.startDate && picker.options.endDate) {
    markChosenLabel(picker)
    clickApply(picker)
    return
  }

  renderTimePicker(picker, 'left')
  renderTimePicker(picker, 'right')

  if (focusClass) {
    const timeRoot =
      picker.container.querySelector(`.drp-time-row .calendar-time.${side}`) ??
      picker.container.querySelector(`.drp-calendar.${side} .calendar-time`)

    const focusEl = timeRoot?.querySelector(`select.${focusClass}`)

    if (focusEl && !focusEl.disabled) {
      focusEl.focus({ preventScroll: true })
    }
  }
}
