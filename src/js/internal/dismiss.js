import { clickCancel } from './interactions.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/** Closes the picker when the user clicks/taps outside it.
 *  @param {DateRangePicker} picker
 *  @param {Event} e */
export function outsideClick(picker, e) {
  if (picker.element.contains(e.target) || picker.container.contains(e.target) || e.target.closest('.calendar-table')) {
    return
  }

  // Guard against the click event that triggered show() immediately bubbling up
  // to the document listener and closing the picker that was just opened.
  if (picker._state.showTime && Date.now() - picker._state.showTime < 50) return

  // Record when the close happened so show() can guard against immediately
  // reopening when an external toggle button calls toggle().
  picker._state.outsideClickTime = Date.now()

  dismiss(picker)
}

/**
 * Closes the picker, optionally cancelling unapplied changes when `cancelOnClose` is set.
 * Shared by outside-click and Escape-key dismissal.
 * @param {DateRangePicker} picker
 */
export function dismiss(picker) {
  if (picker.options.cancelOnClose) {
    clickCancel(picker)
  } else {
    picker.hide()
  }
}
