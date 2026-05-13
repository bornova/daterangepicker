import { DateTime } from 'luxon'

import { escapeHtml, to24h } from './helpers.js'
import { allCalendars, calendarAt, sideFromIndex } from './calendars.js'
import { readTime } from './dates.js'
import { formatRange } from './dates.js'
import { markChosenLabel } from './commit.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/** Number of rows in a calendar grid. */
export const CALENDAR_ROWS = 6
/** Number of columns (weekdays) in a calendar grid. */
export const CALENDAR_COLS = 7
/** Total day cells rendered in a calendar grid. */
export const CALENDAR_CELLS = CALENDAR_ROWS * CALENDAR_COLS

/**
 * Locates the time picker container for one side of the picker. Modern templates
 * place it under `.drp-time-row`; legacy templates nest it inside the calendar.
 * @param {DateRangePicker} picker
 * @param {'left'|'right'} side
 * @returns {Element|null}
 */
function findTimeElement(picker, side) {
  return (
    picker.container.querySelector(`.drp-time-row .calendar-time.${side}`) ??
    picker.container.querySelector(`.drp-calendar.${side} .calendar-time`)
  )
}

/**
 * Refreshes the entire picker UI — selected/duration text, calendar months, calendar grids,
 * time pickers (when enabled), and the Apply button state.
 * @param {DateRangePicker} picker
 */
export function updateView(picker) {
  const timeRow = picker.container.querySelector('.drp-time-row')
  const leftTimeEl = findTimeElement(picker, 'left')

  if (picker.options.showTimePicker) {
    if (timeRow) {
      timeRow.classList.toggle('single-time', picker.options.singleDatePicker)
      timeRow.style.display = picker.container.classList.contains('show-calendar') ? 'grid' : 'none'
    }

    renderTimePicker(picker, 'left')
    renderTimePicker(picker, 'right')

    const rightTimeEl = findTimeElement(picker, 'right')

    if (rightTimeEl) {
      rightTimeEl.style.display = picker.options.singleDatePicker ? 'none' : ''
    }

    if (leftTimeEl) {
      leftTimeEl.style.display = ''
    }

    const rightSelects = picker.container.querySelectorAll('.calendar-time.right select')

    rightSelects.forEach((el) => {
      el.disabled = false
      el.classList.remove('disabled')
    })
  } else if (timeRow) {
    timeRow.style.display = 'none'
  }

  updateSelected(picker)
  updateMonths(picker)
  updateCalendars(picker)
  updateApplyButton(picker)
}

/**
 * Updates the `.drp-selected` range string and, if `durationFormat` is set,
 * the `.drp-duration` span next to it.
 * @param {DateRangePicker} picker
 */
export function updateSelected(picker) {
  const selectedEl = picker.container.querySelector('.drp-selected')

  if (!selectedEl) return

  selectedEl.style.display = picker.options.showSelectedDates ? '' : 'none'
  selectedEl.innerHTML = formatRange(picker)

  const durEl = picker.container.querySelector('.drp-duration')

  if (durEl) {
    if (
      picker.options.showDuration &&
      picker.options.durationFormat &&
      !picker.options.singleDatePicker &&
      picker.options.startDate &&
      picker.options.endDate
    ) {
      const durEnd =
        picker.options.inclusiveDuration && !picker.options.showTimePicker
          ? picker.options.endDate.plus({ milliseconds: 1 })
          : picker.options.endDate
      durEl.textContent = durEnd
        .diff(picker.options.startDate, ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'])
        .toFormat(picker.options.durationFormat)
    } else {
      durEl.textContent = ''
    }
  }
}

/**
 * Ensures all calendar panels display months that contain the current start/end selection.
 * @param {DateRangePicker} picker
 */
export function updateMonths(picker) {
  const syncCalendars = picker.options.syncCalendars || picker.options.calendarCount === 1
  const allCals = allCalendars(picker)
  const allYMs = allCals.map((c) => c.month?.toFormat('yyyy-MM'))

  if (picker.options.endDate) {
    const startYM = picker.options.startDate.toFormat('yyyy-MM')
    const endYM = picker.options.endDate.toFormat('yyyy-MM')

    if (
      picker.options.calendarCount !== 1 &&
      allYMs.every(Boolean) &&
      allYMs.some((ym) => ym === startYM) &&
      allYMs.some((ym) => ym === endYM)
    ) {
      return
    }

    picker._state.leftCalendar.month = picker.options.startDate.set({ day: 2 })

    if (syncCalendars) {
      for (let i = 1; i < allCals.length; i++) {
        allCals[i].month = picker._state.leftCalendar.month.plus({ months: i })
      }
    } else {
      for (let i = 1; i < allCals.length - 1; i++) {
        allCals[i].month = picker._state.leftCalendar.month.plus({ months: i })
      }

      const secondToLast = allCals[allCals.length - 2]
      const targetRight =
        picker.options.endDate.month !== picker.options.startDate.month ||
        picker.options.endDate.year !== picker.options.startDate.year
          ? picker.options.endDate.set({ day: 2 })
          : picker._state.leftCalendar.month.plus({ months: allCals.length - 1 })

      picker._state.rightCalendar.month =
        targetRight.toFormat('yyyy-MM') > secondToLast.month.toFormat('yyyy-MM')
          ? targetRight
          : secondToLast.month.plus({ months: 1 })
    }
  } else {
    const refDate = picker.options.startDate ?? DateTime.now()
    const startYM = refDate.toFormat('yyyy-MM')

    if (!allYMs.every(Boolean) || !allYMs.some((ym) => ym === startYM)) {
      picker._state.leftCalendar.month = refDate.set({ day: 2 })

      if (syncCalendars) {
        for (let i = 1; i < allCals.length; i++) {
          allCals[i].month = picker._state.leftCalendar.month.plus({ months: i })
        }
      } else {
        for (let i = 1; i < allCals.length - 1; i++) {
          allCals[i].month = picker._state.leftCalendar.month.plus({ months: i })
        }

        picker._state.rightCalendar.month = picker._state.leftCalendar.month.plus({ months: allCals.length - 1 })
      }
    }
  }

  if (
    picker.options.maxDate &&
    syncCalendars &&
    !picker.options.singleDatePicker &&
    picker._state.rightCalendar.month > picker.options.maxDate
  ) {
    picker._state.rightCalendar.month = picker.options.maxDate.set({ day: 2 })
    picker._state.leftCalendar.month = picker.options.maxDate
      .set({ day: 2 })
      .minus({ months: picker.options.calendarCount - 1 })

    for (let i = 1; i < allCals.length - 1; i++) {
      allCals[i].month = picker._state.leftCalendar.month.plus({ months: i })
    }
  }
}

/**
 * Rebuilds each calendar panel's grid data, re-renders the markup, and refreshes the
 * active state in the ranges list.
 * @param {DateRangePicker} picker
 */
export function updateCalendars(picker) {
  if (picker.options.showTimePicker) {
    const side = picker.options.endDate ? 'left' : 'right'
    const { hour, minute, second } = readTime(picker, side)

    picker._state.leftCalendar.month = picker._state.leftCalendar.month.set({ hour, minute, second })
    picker._state.rightCalendar.month = picker._state.rightCalendar.month.set({ hour, minute, second })
  }

  for (let i = 0; i < allCalendars(picker).length; i++) {
    renderCalendar(picker, i)
  }

  picker.container.querySelectorAll('.drp-ranges li').forEach((el) => el.classList.remove('active'))

  if (picker.options.endDate != null) {
    markChosenLabel(picker)
  } else if (picker._state.customRangeSelected) {
    const lis = picker.container.querySelectorAll('.drp-ranges li')
    const last = lis[lis.length - 1]

    if (last) {
      last.classList.add('active')
    }
  }
}

/**
 * Builds and injects the HTML for one calendar grid, including header navigation,
 * weekday/week-number headers, and 6×7 day cells with appropriate state classes.
 * @param {DateRangePicker} picker
 * @param {number|'left'|'right'} sideOrIdx Calendar index, or `'left'`/`'right'` shorthand.
 */
export function renderCalendar(picker, sideOrIdx) {
  let idx, isFirst, isLast

  if (typeof sideOrIdx === 'number') {
    idx = sideOrIdx
    isFirst = idx === 0
    isLast = idx === allCalendars(picker).length - 1
  } else {
    isFirst = sideOrIdx === 'left'
    isLast = sideOrIdx === 'right'
    idx = isFirst ? 0 : allCalendars(picker).length - 1
  }

  const calState = calendarAt(picker, idx)

  // Luxon months are 1-based; monthIdx is 0-based for array indexing and HTML select values
  const monthIdx = calState.month.month - 1
  const year = calState.month.year
  const hour = calState.month.hour
  const minute = calState.month.minute
  const second = calState.month.second

  const firstOfMonth = DateTime.fromObject({ year, month: monthIdx + 1, day: 1 })
  const lastDay = firstOfMonth.endOf('month').startOf('day')
  const prevMonth = firstOfMonth.minus({ months: 1 })
  const daysInLastMonth = prevMonth.daysInMonth
  const dayOfWeek = firstOfMonth.weekday % 7 // ISO (1=Mon…7=Sun) → Sun=0…Sat=6

  const calendar = []

  calendar.firstDay = firstOfMonth
  calendar.lastDay = lastDay

  for (let i = 0; i < CALENDAR_ROWS; i++) {
    calendar[i] = []
  }

  let startDay = daysInLastMonth - dayOfWeek + picker.options.locale.firstDay + 1

  if (startDay > daysInLastMonth) {
    startDay -= 7
  }

  if (dayOfWeek === picker.options.locale.firstDay) {
    startDay = daysInLastMonth - 6
  }

  let curDate = DateTime.fromObject({
    year: prevMonth.year,
    month: prevMonth.month,
    day: startDay,
    hour: 12,
    minute,
    second
  })

  for (let i = 0, col = 0, row = 0; i < CALENDAR_CELLS; i++, col++, curDate = curDate.plus({ days: 1 })) {
    if (i > 0 && col % CALENDAR_COLS === 0) {
      col = 0
      row++
    }

    calendar[row][col] = curDate.set({ hour, minute, second })

    if (
      picker.options.minDate &&
      calendar[row][col].hasSame(picker.options.minDate, 'day') &&
      calendar[row][col] < picker.options.minDate &&
      isFirst
    ) {
      calendar[row][col] = picker.options.minDate
    }

    if (
      picker.options.maxDate &&
      calendar[row][col].hasSame(picker.options.maxDate, 'day') &&
      calendar[row][col] > picker.options.maxDate &&
      isLast
    ) {
      calendar[row][col] = picker.options.maxDate
    }
  }

  calState.calendar = calendar

  let minDate = picker.options.minDate
  let spanMinDate = null

  if (!picker.options.endDate && picker.options.startDate && picker.options.minDuration) {
    const minDurationLimit = picker.options.startDate.plus({
      days: picker.options.inclusiveDuration ? picker.options.minDuration - 1 : picker.options.minDuration
    })

    if (!minDate || minDurationLimit > minDate) {
      spanMinDate = minDurationLimit
    }
  }

  let maxDate = picker.options.maxDate
  const syncCalendars = picker.options.syncCalendars || picker.options.calendarCount === 1

  const showPrev = (!minDate || minDate < calendar.firstDay) && (isFirst || (!syncCalendars && isLast))
  const showNext =
    (!maxDate || maxDate > calendar.lastDay) &&
    (isLast || picker.options.calendarCount === 1 || (!syncCalendars && isFirst))

  const allCals = allCalendars(picker)
  const prevBlocked =
    !syncCalendars &&
    idx > 0 &&
    calState.month.minus({ months: 1 }).toFormat('yyyy-MM') <= allCals[idx - 1].month.toFormat('yyyy-MM')

  const nextBlocked =
    !syncCalendars &&
    idx < allCals.length - 1 &&
    calState.month.plus({ months: 1 }).toFormat('yyyy-MM') >= allCals[idx + 1].month.toFormat('yyyy-MM')

  const monthName = escapeHtml(picker.options.locale.monthNames[monthIdx])
  let dateHtml = `${monthName} ${year}`

  if (picker.options.showMonthYearDropdowns && (isFirst || isLast)) {
    const maxYear = (maxDate && maxDate.year) || DateTime.now().plus({ years: 100 }).year
    const minYear = (minDate && minDate.year) || DateTime.now().minus({ years: 100 }).year
    const inMinYear = year === minYear
    const inMaxYear = year === maxYear

    const monthOptions = Array.from({ length: 12 }, (_, m) => {
      const selectable =
        (!inMinYear || !minDate || m >= minDate.month - 1) && (!inMaxYear || !maxDate || m <= maxDate.month - 1)

      const sel = m === monthIdx ? " selected='selected'" : ''
      const dis = selectable ? '' : " disabled='disabled'"

      return `<option value='${m}'${sel}${dis}>${picker.options.locale.monthNames[m]}</option>`
    }).join('')

    const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
      .map((y) => `<option value="${y}"${y === year ? ' selected="selected"' : ''}>${y}</option>`)
      .join('')

    dateHtml = `<select class="monthselect">${monthOptions}</select><select class="yearselect">${yearOptions}</select>`
  }

  const showWeekNums = picker.options.showWeekNumbers || picker.options.showISOWeekNumbers
  const weekLabelHeader = showWeekNums
    ? `<div class="week day-header" role="columnheader">${picker.options.locale.weekLabel}</div>`
    : ''

  const dayHeaders = picker.options.locale.daysOfWeek
    .map((d) => `<div class="day-header" role="columnheader">${d}</div>`)
    .join('')

  if (picker.options.endDate == null && picker.options.startDate && picker.options.maxDuration) {
    const maxLimit = picker.options.startDate
      .plus({ days: picker.options.inclusiveDuration ? picker.options.maxDuration - 1 : picker.options.maxDuration })
      .endOf('day')

    if (!maxDate || maxLimit < maxDate) {
      maxDate = maxLimit
    }
  }

  const today = DateTime.now()
  const minDay = minDate ? minDate.startOf('day') : null
  const maxDay = maxDate ? maxDate.startOf('day') : null

  const bodyCells = Array.from({ length: CALENDAR_ROWS }, (_, row) => {
    const weekNum = showWeekNums
      ? (() => {
          let wn

          if (picker.options.showISOWeekNumbers) {
            wn = calendar[row][(1 - picker.options.locale.firstDay + 7) % 7].weekNumber
          } else {
            const dt = calendar[row][0]
            const jan1 = dt.startOf('year')
            const jan1Dow = jan1.weekday % 7
            const daysFromWeekStart = (jan1Dow - picker.options.locale.firstDay + 7) % 7

            wn = Math.floor((dt.ordinal + daysFromWeekStart - 1) / 7) + 1
          }

          return `<div class="week calendar-cell">${wn}</div>`
        })()
      : ''

    const cells = Array.from({ length: CALENDAR_COLS }, (_, col) => {
      const dt = calendar[row][col]
      const dtDay = dt.startOf('day')
      const classes = []

      if (dt.hasSame(today, 'day')) {
        classes.push('today')
      }

      if (dt.weekday > 5) {
        classes.push('weekend')
      } // 6=Sat,7=Sun

      if (dt.month !== monthIdx + 1) {
        classes.push('off', 'ends')
      }

      if (minDate && dtDay < minDay) {
        classes.push('off', 'disabled')
      } else if (spanMinDate && dtDay < spanMinDate.startOf('day')) {
        classes.push('out-of-span')
      }

      if (maxDate && dtDay > maxDay) {
        classes.push('off', 'disabled')
      }

      const isDisabledByList = Array.isArray(picker.options.disabledDates)
        ? picker.options.disabledDates.some((d) => d && d.hasSame(dt, 'day'))
        : typeof picker.options.disabledDates === 'function'
          ? picker.options.disabledDates(dt)
          : false

      if (isDisabledByList) {
        classes.push('off', 'disabled')
      }

      if (picker.options.startDate && dt.hasSame(picker.options.startDate, 'day')) {
        classes.push('active', 'start-date')
      }

      if (picker.options.endDate && dt.hasSame(picker.options.endDate, 'day')) {
        classes.push('active', 'end-date')
      }

      if (
        picker.options.endDate &&
        picker.options.startDate &&
        dt > picker.options.startDate &&
        dt < picker.options.endDate
      ) {
        classes.push('in-range')
      }

      const custom = picker.options.dayClassFn ? picker.options.dayClassFn(dt) : false

      if (custom) {
        classes.push(...(typeof custom === 'string' ? [custom] : custom))
      }

      if (!classes.includes('disabled')) {
        classes.push('available')
      }

      if (picker._state.focusedDate && dt.hasSame(picker._state.focusedDate, 'day') && !classes.includes('off')) {
        classes.push('focused')
      }

      if (picker.options.highlightToday && dt.hasSame(today, 'day')) {
        classes.push('drp-today')
      }

      const isSelected = classes.includes('active')
      const isOff = classes.includes('disabled')
      const ariaSelected = isSelected ? ' aria-selected="true"' : ''
      const ariaDisabled = isOff ? ' aria-disabled="true"' : ''
      const ariaCurrent = dt.hasSame(today, 'day') ? ' aria-current="date"' : ''
      const ariaLabel = ` aria-label="${dt.toFormat('MMMM d, yyyy')}"`

      return `<div class="${classes.join(' ').trim()} calendar-cell" role="gridcell" data-title="r${row}c${col}"${ariaSelected}${ariaDisabled}${ariaCurrent}${ariaLabel}>${dt.day}</div>`
    }).join('')

    return weekNum + cells
  }).join('')

  const html = `
    <div class="table-condensed">
      <div class="calendar-nav" role="navigation" aria-label="${monthName} ${year}">
        ${showPrev ? `<div class="prev ${prevBlocked ? 'unavailable' : 'available'}" aria-label="Previous month"><span></span></div>` : '<div></div>'}
        <div class="month">${dateHtml}</div>
        ${showNext ? `<div class="next ${nextBlocked ? 'unavailable' : 'available'}" aria-label="Next month"><span></span></div>` : '<div></div>'}
      </div>
      <div class="calendar-grid${showWeekNums ? ' show-week-numbers' : ''}" role="grid" aria-label="${monthName} ${year}">
        ${weekLabelHeader}${dayHeaders}${bodyCells}
      </div>
    </div>`.trim()

  const tableEl =
    picker.container.querySelector(`[data-cal-index="${idx}"] .calendar-table`) ??
    picker.container.querySelector(`.drp-calendar.${sideFromIndex(picker, idx) ?? 'left'} .calendar-table`)

  if (!tableEl) return

  tableEl.innerHTML = html
}

/**
 * Builds and injects the HTML for the time picker dropdowns on one side
 * (hour, minute, optional seconds, optional AM/PM).
 * @param {DateRangePicker} picker
 * @param {'left'|'right'} side
 */
export function renderTimePicker(picker, side) {
  const timeContainer = findTimeElement(picker, side)

  if (!timeContainer) return

  if (side === 'right' && !picker.options.endDate) {
    if (timeContainer.innerHTML !== '') return
  }

  let maxDate = picker.options.maxDate

  if (picker.options.maxDuration && picker.options.startDate) {
    const maxDurationLimit = picker.options.startDate.plus({
      days: picker.options.inclusiveDuration ? picker.options.maxDuration - 1 : picker.options.maxDuration
    })

    if (!picker.options.maxDate || maxDurationLimit < picker.options.maxDate) {
      maxDate = maxDurationLimit
    }
  }

  const defaultTime = DateTime.now().startOf('day')
  let selected, minDate

  if (side === 'left') {
    selected = picker.options.startDate ?? defaultTime
    minDate = picker.options.minDate
  } else {
    selected = picker.options.endDate ?? defaultTime
    minDate = picker.options.startDate

    const timeSelector = timeContainer

    if (timeSelector && timeSelector.innerHTML !== '' && !picker.options.timePicker24Hour) {
      const ampmEl = timeSelector.querySelector('.ampmselect')

      if (ampmEl) {
        if (ampmEl.value === 'PM' && selected.hour < 12) {
          selected = selected.set({ hour: selected.hour + 12 })
        }

        if (ampmEl.value === 'AM' && selected.hour === 12) {
          selected = selected.set({ hour: 0 })
        }
      }
    }

    if (selected < picker.options.startDate) {
      selected = picker.options.startDate
    }

    if (maxDate && selected > maxDate) {
      selected = maxDate
    }
  }

  const hStart = picker.options.timePicker24Hour ? 0 : 1
  const hEnd = picker.options.timePicker24Hour ? 23 : 12
  const isPm = selected.hour >= 12
  const hourOptions = Array.from({ length: hEnd - hStart + 1 }, (_, idx) => {
    const i = hStart + idx
    const i24 = picker.options.timePicker24Hour ? i : to24h(i, isPm)
    const time = selected.set({ hour: i24 })
    const disabled = (minDate && time.set({ minute: 59 }) < minDate) || (maxDate && time.set({ minute: 0 }) > maxDate)

    return makeOption(i, i, i24 === selected.hour && !disabled, disabled)
  }).join('')

  const minuteOptions = Array.from({ length: Math.ceil(60 / picker.options.minuteIncrement) }, (_, idx) => {
    const i = idx * picker.options.minuteIncrement
    const time = selected.set({ minute: i })
    const disabled = (minDate && time.set({ second: 59 }) < minDate) || (maxDate && time.set({ second: 0 }) > maxDate)

    return makeOption(i, String(i).padStart(2, '0'), selected.minute === i && !disabled, disabled)
  }).join('')

  let secondHtml = ''

  if (picker.options.timePickerSeconds) {
    const secondOptions = Array.from({ length: 60 }, (_, i) => {
      const time = selected.set({ second: i })
      const disabled = (minDate && time < minDate) || (maxDate && time > maxDate)

      return makeOption(i, String(i).padStart(2, '0'), selected.second === i && !disabled, disabled)
    }).join('')

    secondHtml = `: <select class="secondselect">${secondOptions}</select> `
  }

  let ampmHtml = ''

  if (!picker.options.timePicker24Hour) {
    const amAttr =
      minDate && selected.set({ hour: 12, minute: 0, second: 0 }) < minDate
        ? ' disabled="disabled" class="disabled"'
        : ''

    const pmAttr =
      maxDate && selected.set({ hour: 12, minute: 0, second: 0 }) > maxDate
        ? ' disabled="disabled" class="disabled"'
        : ''

    const amSel = selected.hour < 12 ? ' selected="selected"' : ''
    const pmSel = selected.hour >= 12 ? ' selected="selected"' : ''

    ampmHtml = `<select class="ampmselect"><option value="AM"${amSel}${amAttr}>AM</option><option value="PM"${pmSel}${pmAttr}>PM</option></select>`
  }

  timeContainer.innerHTML = `<select class="hourselect">${hourOptions}</select> : <select class="minuteselect">${minuteOptions}</select> ${secondHtml}${ampmHtml}`
}

/**
 * Syncs the Apply button's enabled/disabled state based on the current selection.
 * @param {DateRangePicker} picker
 */
export function updateApplyButton(picker) {
  const valid =
    picker.options.singleDatePicker ||
    (picker.options.startDate && picker.options.endDate && picker.options.startDate <= picker.options.endDate)

  const applyBtn = picker.container.querySelector('button.drp-apply-button')

  if (applyBtn) {
    applyBtn.disabled = !valid
  }
}

/**
 * Builds an `<option>` HTML string with `selected` and/or `disabled` attributes.
 * @param {string|number} value
 * @param {string|number} label
 * @param {boolean} isSelected
 * @param {boolean} isDisabled
 * @returns {string}
 */
export function makeOption(value, label, isSelected, isDisabled) {
  const sel = isSelected ? ' selected="selected"' : ''
  const dis = isDisabled ? ' disabled="disabled" class="disabled"' : ''

  return `<option value="${value}"${sel}${dis}>${label}</option>`
}
