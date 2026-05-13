/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Initializes runtime flags and calendar state containers on the picker instance.
 * All internal state is stored in a single non-enumerable `_state` object so it is
 * hidden from serialization and property enumeration.
 * @param {DateRangePicker} picker
 */
export function initState(picker) {
  Object.defineProperty(picker, '_state', {
    value: {
      focusedDate: null,
      listeners: [],
      hasPendingUnappliedSelection: false,
      skipCommitOnHide: false,
      isShowing: false,
      leftCalendar: {},
      rightCalendar: {}
    },
    enumerable: false,
    configurable: true
  })
}

/**
 * Normalizes initial `startDate`/`endDate` values based on `showTimePicker` and `singleDatePicker` modes,
 * and hides the time-picker rows when not used.
 * @param {DateRangePicker} picker
 */
export function initDates(picker) {
  if (!picker.options.showTimePicker) {
    if (picker.options.startDate) {
      picker.options.startDate = picker.options.startDate.startOf('day')
    }

    if (picker.options.endDate) {
      picker.options.endDate = picker.options.endDate.endOf('day')
    }

    picker.container.querySelectorAll('.calendar-time').forEach((el) => {
      el.style.display = 'none'
    })
  }

  if (picker.options.singleDatePicker) {
    picker.options.endDate = picker.options.startDate
  }
}
