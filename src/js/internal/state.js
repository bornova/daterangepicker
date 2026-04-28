/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Initializes runtime flags and calendar state containers on the picker instance.
 * @param {DateRangePicker} picker
 */
export function initState(picker) {
  picker._focusedDate = null
  picker._listeners = []
  picker._hasPendingUnappliedSelection = false
  picker._skipCommitOnHide = false
  picker._isShowing = false
  picker._leftCalendar = {}
  picker._rightCalendar = {}
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
