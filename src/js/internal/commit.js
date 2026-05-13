import { showCalendars } from './positioning.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Determines which predefined range label (if any) matches the current selection,
 * marks it active in the ranges list, and updates `picker._chosenLabel`.
 * Falls back to the Custom Range entry when no preset matches.
 * @param {DateRangePicker} picker
 */
export function markChosenLabel(picker) {
  if (!Object.keys(picker.options.ranges).length) {
    picker._state.chosenLabel = null

    return
  }

  const granularity = picker.options.showTimePicker ? (picker.options.timePickerSeconds ? 'second' : 'minute') : 'day'

  if (!picker._state.customRangeSelected) {
    for (const [range, [rangeStart, rangeEnd]] of Object.entries(picker.options.ranges)) {
      if (
        picker.options.startDate.hasSame(rangeStart, granularity) &&
        picker.options.endDate.hasSame(rangeEnd, granularity)
      ) {
        const li = picker.container.querySelector(`.drp-ranges li[data-range-key="${CSS.escape(range)}"]`)

        if (li) {
          li.classList.add('active')
          picker._state.chosenLabel = li.getAttribute('data-range-key')
        }

        return
      }
    }
  }

  if (picker.options.showCustomRange) {
    const lis = picker.container.querySelectorAll('.drp-ranges li')
    const last = lis[lis.length - 1]

    if (last) {
      last.classList.add('active')
      picker._state.chosenLabel = last.getAttribute('data-range-key')
    } else {
      picker._state.chosenLabel = null
    }
  } else {
    picker._state.chosenLabel = null
  }

  showCalendars(picker)
}

/**
 * Compares two nullable Luxon `DateTime` values for equality.
 * @param {object|null} a
 * @param {object|null} b
 * @returns {boolean}
 */
export function datesEqual(a, b) {
  if (a === null && b === null) return true
  if (a === null || b === null) return false

  return a.equals(b)
}

/**
 * Checks whether the current `startDate`/`endDate` differ from a previous pair.
 * @param {DateRangePicker} picker
 * @param {object|null} oldStartDate
 * @param {object|null} oldEndDate
 * @returns {boolean}
 */
export function rangeChanged(picker, oldStartDate, oldEndDate) {
  const startDate = picker.options.startDate ?? null
  const endDate = picker.options.endDate ?? null
  const oldStart = oldStartDate ?? null
  const oldEnd = oldEndDate ?? null

  return !datesEqual(oldStart, startDate) || !datesEqual(oldEnd, endDate)
}

/**
 * Dispatches a bubbling `CustomEvent` on the picker's attached element.
 * @param {DateRangePicker} picker
 * @param {string} eventName
 * @param {*} detail
 */
export function trigger(picker, eventName, detail) {
  picker.element.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }))
}

/**
 * Emits a `change` event when the committed selection differs from the previous one.
 * @param {DateRangePicker} picker
 * @param {object|null} oldStartDate
 * @param {object|null} oldEndDate
 * @param {'apply'|'autoApply'|string} [source='apply']
 * @returns {boolean} `true` when the event was emitted.
 */
export function emitChange(picker, oldStartDate, oldEndDate, source = 'apply') {
  if (!rangeChanged(picker, oldStartDate, oldEndDate)) return false

  trigger(picker, 'change', {
    oldStartDate,
    oldEndDate,
    startDate: picker.options.startDate ?? null,
    endDate: picker.options.endDate ?? null,
    chosenLabel: picker._state.chosenLabel ?? null,
    source
  })

  return true
}

/**
 * Applies callback, input sync, and `change` event side-effects for a committed selection.
 * @param {DateRangePicker} picker
 * @param {object|null} oldStartDate
 * @param {object|null} oldEndDate
 * @param {'apply'|'autoApply'|string} [source='apply']
 * @param {{ callbackOnChangedOnly?: boolean }} [options]
 */
export function commit(picker, oldStartDate, oldEndDate, source = 'apply', options = {}) {
  const { callbackOnChangedOnly = true } = options
  const hasRange = !!(picker.options.startDate && picker.options.endDate)
  const changed = rangeChanged(picker, oldStartDate ?? null, oldEndDate ?? null)

  if (hasRange && (!callbackOnChangedOnly || changed)) {
    picker.callback(picker.options.startDate, picker.options.endDate, picker._state.chosenLabel)
  }

  if (picker._state.openedWithEmptyInput) {
    if (picker.element.matches('input')) {
      picker.element.value = ''
    }
  } else {
    picker.updateInput()
  }

  emitChange(picker, oldStartDate ?? null, oldEndDate ?? null, source)
}

/**
 * Returns a lightweight snapshot of visible state and the selected range.
 * @param {DateRangePicker} picker
 * @returns {{ isShowing: boolean, startDate: object|null, endDate: object|null, chosenLabel: string|null }}
 */
export function snapshot(picker) {
  return {
    isShowing: picker._state.isShowing,
    startDate: picker.options.startDate ?? null,
    endDate: picker.options.endDate ?? null,
    chosenLabel: picker._state.chosenLabel ?? null
  }
}
