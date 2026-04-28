import { allCalendars, clampCalendarMonths } from './calendars.js'
import {
  clickPrev,
  clickNext,
  clickRange,
  clickApply,
  clickCancel,
  clickClear,
  clickDate,
  hoverDate,
  changeMonthOrYear,
  changeTime
} from './interactions.js'
import { outsideClick } from './dismiss.js'
import { onKeyNav } from './keyboard.js'
import { move } from './positioning.js'
import { updateCalendars } from './rendering.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Container event names paired with the picker property holding their proxy handler.
 * Iterated by {@link attachHandlers} and {@link detachHandlers} so adding a new
 * delegated handler only requires updating this list.
 * @type {Array<[string, string, AddEventListenerOptions?]>}
 */
const CONTAINER_HANDLERS = [
  ['click', '_containerClickHandler'],
  ['mousedown', '_containerMousedownHandler'],
  ['mouseover', '_containerMouseoverHandler'],
  ['change', '_containerChangeHandler'],
  ['touchstart', '_containerTouchStartHandler', { passive: true }],
  ['touchend', '_containerTouchEndHandler']
]

/**
 * Builds and stores instance-bound proxy handlers used by container delegation
 * and document/window listeners. Must run before {@link attachHandlers} or `show`.
 * @param {DateRangePicker} picker
 */
export function bindHandlers(picker) {
  picker._outsideClickProxy = (e) => outsideClick(picker, e)
  picker._windowResizeProxy = () => move(picker)

  picker._containerClickHandler = (e) => {
    if (e.target.closest('.prev')) clickPrev(picker, e)
    else if (e.target.closest('.next')) clickNext(picker, e)
    else if (e.target.closest('.drp-ranges li:not(.range-group-header)')) clickRange(picker, e)
    else if (e.target.closest('button.drp-apply-button')) clickApply(picker, e)
    else if (e.target.closest('button.drp-cancel-button')) clickCancel(picker, e)
    else if (e.target.closest('button.drp-clear-button')) clickClear(picker, e)
  }

  picker._containerMousedownHandler = (e) => {
    const cell = e.target.closest('.calendar-cell.available')

    if (cell) {
      clickDate(picker, { target: cell, stopPropagation: e.stopPropagation.bind(e) })
    }
  }

  picker._containerMouseoverHandler = (e) => {
    const cell = e.target.closest('.calendar-cell.available')

    if (cell) {
      hoverDate(picker, { target: cell })
    }
  }

  picker._containerChangeHandler = (e) => {
    if (e.target.matches('select.yearselect, select.monthselect')) {
      changeMonthOrYear(picker, e)
    } else if (e.target.matches('select.hourselect, select.minuteselect, select.secondselect, select.ampmselect')) {
      changeTime(picker, e)
    }
  }

  picker._touchStartX = 0
  picker._touchStartY = 0

  picker._containerTouchStartHandler = (e) => {
    picker._touchStartX = e.touches[0].clientX
    picker._touchStartY = e.touches[0].clientY
  }

  picker._containerTouchEndHandler = (e) => {
    const dx = e.changedTouches[0].clientX - picker._touchStartX
    const dy = e.changedTouches[0].clientY - picker._touchStartY

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      const months = dx > 0 ? -1 : 1
      const syncCalendars = picker.options.syncCalendars || picker.options.calendarCount === 1
      const allCals = allCalendars(picker)

      if (syncCalendars) {
        allCals.forEach((c) => {
          c.month = c.month.plus({ months })
        })
      } else if (dx > 0) {
        picker._leftCalendar.month = picker._leftCalendar.month.minus({ months: 1 })
      } else {
        picker._rightCalendar.month = picker._rightCalendar.month.plus({ months: 1 })
      }

      clampCalendarMonths(picker)

      updateCalendars(picker)
    }
  }

  picker._keyboardNavProxy = (e) => onKeyNav(picker, e)
}

/**
 * Attaches the prebuilt delegated event handlers to the picker container.
 * @param {DateRangePicker} picker
 */
export function attachHandlers(picker) {
  CONTAINER_HANDLERS.forEach(([event, prop, opts]) => {
    picker.container.addEventListener(event, picker[prop], opts)
  })
}

/**
 * Detaches every container handler attached by {@link attachHandlers}.
 * @param {DateRangePicker} picker
 */
export function detachHandlers(picker) {
  CONTAINER_HANDLERS.forEach(([event, prop]) => {
    picker.container.removeEventListener(event, picker[prop])
  })
}

/**
 * Toggles the document/window listeners that close the picker on outside interaction
 * and reposition it on resize/scroll.
 * @param {DateRangePicker} picker
 * @param {boolean} on `true` to attach, `false` to detach.
 */
export function toggleListeners(picker, on) {
  const fn = on ? 'addEventListener' : 'removeEventListener'

  document[fn]('mousedown', picker._outsideClickProxy)
  document[fn]('touchend', picker._outsideClickProxy)
  window[fn]('resize', picker._windowResizeProxy)
  window[fn]('scroll', picker._windowResizeProxy, true)
}
