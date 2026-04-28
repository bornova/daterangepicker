import { createDefaultOptions, applyOptions } from './internal/options.js'
import { getDataAttributes } from './internal/helpers.js'
import { buildContainer, configureContainer, initRanges, mount, refreshContainer } from './internal/template.js'
import { initState, initDates } from './internal/state.js'
import { bindHandlers, attachHandlers, detachHandlers, toggleListeners } from './internal/bindings.js'
import { parseDateTime, snapMinute, formatRange, readInputDates } from './internal/dates.js'
import { updateView, updateSelected, updateMonths } from './internal/rendering.js'
import { clickApply, clickCancel, clickClear } from './internal/interactions.js'
import { snapshot, commit, rangeChanged, trigger } from './internal/commit.js'
import { move } from './internal/positioning.js'

/** @typedef {import('./internal/options.js').DateRangePickerOptions} DateRangePickerOptions */
/** @typedef {{ startDate: object|null, endDate: object|null }} DateRangeValue */
/** @typedef {{ isShowing: boolean, startDate: object|null, endDate: object|null, chosenLabel: string|null }} PickerState */
/** @typedef {'show'|'hide'|'apply'|'cancel'|'clear'|'change'} PickerEventName */

/**
 * DateRangePicker instance that attaches to an `<input>`, `<button>`, or any element.
 *
 * Construct it with `new DateRangePicker(target, options, callback)`.
 */
class DateRangePicker {
  /**
   * Creates a new picker, parses `data-*` attributes from the target element, merges them
   * with the supplied `options`, builds the container, and attaches event handlers.
   *
   * @param {string|Element} element CSS selector or DOM element the picker is bound to.
   * @param {DateRangePickerOptions} [options={}] Configuration. See {@link DateRangePickerOptions}.
   * @param {(startDate: object, endDate: object, chosenLabel: string|null) => void} [callback]
   *   Optional function called whenever the selection is committed (Apply, auto-apply, or
   *   range click). Receives Luxon `DateTime` values and the matched range label, if any.
   * @throws {Error} when `element` cannot be resolved or the template is missing required nodes.
   */
  constructor(element, options = {}, callback) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element

    if (!this.element) throw new Error(`DateRangePicker: element not found: ${element}`)

    this.options = createDefaultOptions()
    this.callback = typeof callback === 'function' ? callback : () => {}

    if (typeof options !== 'object' || options === null) {
      options = {}
    }

    options = { ...getDataAttributes(this.element), ...options }
    applyOptions(this, options)

    const calCount = Math.max(2, this.options.calendarCount)

    this._extraCalendars = Array.from({ length: calCount - 2 }, () => ({}))
    buildContainer(this, options, calCount)
    initRanges(this, options)
    initState(this)
    initDates(this)
    configureContainer(this, options)
    bindHandlers(this)
    attachHandlers(this)
    mount(this)

    if (options.startDate != null || readInputDates(this, options)) {
      this.updateInput()
    }
  }

  // ─── Selection setters ─────────────────────────────────────────────────────

  /**
   * Sets the start of the selected range. The value is parsed (string → Luxon `DateTime`
   * using `locale.format`; `Date` → `DateTime`; `DateTime` passthrough), clamped to
   * `minDate`/`maxDate`, snapped to `minuteIncrement` when `showTimePicker` is on, and
   * mirrored to `endDate` in `singleDatePicker` mode.
   *
   * Updates the visible selection and (when the picker is closed) the attached input.
   * Invalid values are silently ignored.
   *
   * @param {string|Date|object} startDate
   */
  setStartDate(startDate) {
    const parsed = parseDateTime(this, startDate)

    if (!parsed || !parsed.isValid) return

    this.options.startDate = this.options.showTimePicker ? snapMinute(this, parsed) : parsed.startOf('day')

    if (this.options.minDate && this.options.startDate < this.options.minDate) {
      this.options.startDate = snapMinute(this, this.options.minDate, Math.ceil)
    }

    if (this.options.maxDate && this.options.startDate > this.options.maxDate) {
      this.options.startDate = snapMinute(this, this.options.maxDate, Math.floor)
    }

    if (this.options.singleDatePicker) {
      this.options.endDate = this.options.startDate
    }

    if (!this._isShowing) {
      this.updateInput()
    }

    updateSelected(this)
    updateMonths(this)
  }

  /**
   * Sets the end of the selected range. The value is parsed and clamped against `maxDate`,
   * the current `startDate`, and the `minDuration`/`maxDuration` constraints. When
   * `singleDatePicker` is set, this delegates to {@link DateRangePicker#setStartDate}.
   *
   * Updates the visible selection and (when the picker is closed) the attached input.
   * Invalid values are silently ignored.
   *
   * @param {string|Date|object} endDate
   */
  setEndDate(endDate) {
    const parsed = parseDateTime(this, endDate)

    if (!parsed || !parsed.isValid) return

    if (this.options.singleDatePicker) {
      if (!this.options.startDate) {
        this.setStartDate(parsed)
      } else {
        this.options.endDate = this.options.startDate

        if (!this._isShowing) {
          this.updateInput()
        }

        updateSelected(this)
        updateMonths(this)
      }

      return
    }

    this.options.endDate = this.options.showTimePicker ? snapMinute(this, parsed) : parsed

    if (this.options.startDate && this.options.endDate < this.options.startDate) {
      this.options.endDate = this.options.startDate
    }

    const minOffset = this.options.inclusiveDuration ? this.options.minDuration - 1 : this.options.minDuration
    const maxOffset = this.options.inclusiveDuration ? this.options.maxDuration - 1 : this.options.maxDuration

    if (
      this.options.startDate &&
      this.options.minDuration &&
      this.options.endDate < this.options.startDate.plus({ days: minOffset })
    ) {
      this.options.endDate = this.options.startDate.plus({ days: minOffset })
    }

    if (this.options.maxDate && this.options.endDate > this.options.maxDate) {
      this.options.endDate = this.options.maxDate
    }

    if (
      this.options.startDate &&
      this.options.maxDuration &&
      this.options.startDate.plus({ days: maxOffset }) < this.options.endDate
    ) {
      this.options.endDate = this.options.startDate.plus({ days: maxOffset })
    }

    if (!this.options.showTimePicker) {
      this.options.endDate = this.options.endDate.endOf('day')
    }

    updateSelected(this)

    if (!this._isShowing) {
      this.updateInput()
    }

    updateMonths(this)
  }

  /**
   * Sets both `startDate` and `endDate` in one call. Equivalent to
   * {@link DateRangePicker#setStartDate} followed by {@link DateRangePicker#setEndDate},
   * with one re-render afterwards.
   *
   * @param {string|Date|object} startDate
   * @param {string|Date|object} endDate
   */
  setDateRange(startDate, endDate) {
    this.setStartDate(startDate)
    this.setEndDate(endDate)

    if (this._isShowing) {
      updateView(this)
    }
  }

  /**
   * Writes the current selection to the attached `<input>` using `locale.format` and
   * `locale.separator`. No-op when the trigger is not an input or when `autoUpdateInput`
   * is `false`. Dispatches a bubbling `input` event when the value changes.
   */
  updateInput() {
    if (!this.element.matches('input') || !this.options.autoUpdateInput) return

    const newValue = this.options.singleDatePicker
      ? this.options.startDate
        ? this.options.startDate.toFormat(this.options.locale.format)
        : ''
      : formatRange(this)

    if (newValue !== this.element.value) {
      this.element.value = newValue
      this.element.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  // ─── Selection getters ─────────────────────────────────────────────────────

  /**
   * Returns the currently selected range as Luxon `DateTime` values (or `null` when unset).
   * Always reflects the *visible* selection, including unapplied edits while the picker is open.
   * @returns {DateRangeValue}
   */
  getDateRange() {
    return {
      startDate: this.options.startDate ?? null,
      endDate: this.options.endDate ?? null
    }
  }

  /**
   * Returns a snapshot of the picker's public state: visibility, current selection, and
   * the active range label (if a predefined range is selected).
   * @returns {PickerState}
   */
  getState() {
    return snapshot(this)
  }

  // ─── Visibility ────────────────────────────────────────────────────────────

  /**
   * Opens the picker. Snapshots the current selection so {@link DateRangePicker#cancel}
   * can restore it, repositions the container relative to the trigger element
   * (per `openDirection`/`dropDirection`), and fires the `show` event.
   * No-op when already open or when `showInline: true` already keeps it visible.
   */
  show() {
    if (this._isShowing) return

    // If outsideClick just closed the picker (mousedown on an external toggle button
    // fires before its click handler), don't reopen within the same interaction window.
    if (this._outsideClickTime && Date.now() - this._outsideClickTime < 200) return

    if (!this._hasPendingUnappliedSelection) {
      this._oldStartDate = this.options.startDate
      this._oldEndDate = this.options.endDate
    }

    this._oldInputValue = this.element.matches('input') ? this.element.value : null
    this._focusedDate = this.options.startDate
    this._openedWithEmptyInput = this.element.matches('input') && this.element.value === ''

    if (this.options.showInline) {
      this.container.classList.add('show-calendar')
      document.addEventListener('keydown', this._keyboardNavProxy)
      updateView(this)
      this.container.setAttribute('aria-hidden', 'false')
      this.container.focus({ preventScroll: true })
      this._showTime = Date.now()
      trigger(this, 'show', this)
      this._isShowing = true

      return
    }

    toggleListeners(this, true)
    document.addEventListener('keydown', this._keyboardNavProxy)

    updateView(this)
    this.container.style.display = 'block'
    this.container.setAttribute('aria-hidden', 'false')
    move(this)
    this.container.focus({ preventScroll: true })
    this._showTime = Date.now()
    trigger(this, 'show', this)
    this._isShowing = true
  }

  /**
   * Closes the picker and fires the `hide` event. Behaviour depends on options:
   * - `autoApply: true` — commits the selection and emits `change`.
   * - `cancelOnClose: true` — reverts to the values held when the picker opened.
   * - otherwise — keeps any in-progress selection as "pending" until the next interaction.
   *
   * No-op when the picker is not currently open.
   */
  hide() {
    if (!this._isShowing) return

    if (!this.options.endDate && !this._skipCommitOnHide) {
      this.options.startDate = this._oldStartDate
      this.options.endDate = this._oldEndDate
      this._hasPendingUnappliedSelection = false
    }

    const changedSinceOpen =
      !!this.options.endDate && rangeChanged(this, this._oldStartDate ?? null, this._oldEndDate ?? null)

    const committing = this._skipCommitOnHide ? false : this.options.autoApply || this._commitOnHide
    const commitSource = this._commitOnHide ? 'apply' : 'autoApply'

    this._commitOnHide = false
    this._skipCommitOnHide = false

    if (committing) {
      this._hasPendingUnappliedSelection = false
      commit(this, this._oldStartDate ?? null, this._oldEndDate ?? null, commitSource, {
        callbackOnChangedOnly: true
      })
    } else if (this._openedWithEmptyInput) {
      if (this.element.matches('input')) this.element.value = ''
    }

    if (!committing && changedSinceOpen) {
      this._hasPendingUnappliedSelection = true
    }

    if (this.options.showInline) {
      this._oldStartDate = this.options.startDate
      this._oldEndDate = this.options.endDate
      updateView(this)

      return
    }

    if (this.container.contains(document.activeElement)) {
      this.element.focus()
    }

    toggleListeners(this, false)
    document.removeEventListener('keydown', this._keyboardNavProxy)
    this._focusedDate = null
    this.container.style.display = 'none'
    this.container.setAttribute('aria-hidden', 'true')
    trigger(this, 'hide', this)
    this._isShowing = false
  }

  /** Toggles the picker between {@link DateRangePicker#show} and {@link DateRangePicker#hide}. */
  toggle() {
    if (this._isShowing) {
      this.hide()
    } else {
      this.show()
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  /**
   * Programmatically applies the current selection — same as the user clicking Apply.
   * Fires `apply`, then commits and emits `change` if the range differs from the previous
   * committed one. Closes the picker when `closeOnApply: true`.
   */
  apply() {
    clickApply(this)
  }

  /**
   * Programmatically cancels any uncommitted edits and restores the selection that was
   * active when the picker opened. Fires `cancel`. Closes the picker when `closeOnCancel: true`.
   */
  cancel() {
    clickCancel(this)
  }

  /**
   * Clears the selection: sets `startDate`/`endDate` to `null`, empties the attached input,
   * closes the picker, and fires `clear`.
   */
  clear() {
    clickClear(this)
  }

  // ─── Configuration ─────────────────────────────────────────────────────────

  /**
   * Updates options at runtime and re-renders the picker. Accepts any subset of
   * {@link DateRangePickerOptions}; unspecified options are preserved. Touching `ranges`,
   * `showCustomRange`, or `locale.customRangeLabel` rebuilds the ranges list.
   *
   * @param {DateRangePickerOptions} [options={}]
   */
  setOptions(options = {}) {
    if (typeof options !== 'object' || options === null) return

    const touchesRanges =
      Object.prototype.hasOwnProperty.call(options, 'ranges') ||
      Object.prototype.hasOwnProperty.call(options, 'showCustomRange') ||
      (options.locale && Object.prototype.hasOwnProperty.call(options.locale, 'customRangeLabel'))

    if (touchesRanges) {
      const rangesRoot = this.container.querySelector('.drp-ranges')

      this.options.ranges = {}

      if (rangesRoot) {
        rangesRoot.innerHTML = ''
      }
    }

    applyOptions(this, options)

    if (touchesRanges) {
      initRanges(this, { ranges: options.ranges ?? {} })
    }

    refreshContainer(this, options)
    updateView(this)

    if (this._isShowing && !this.options.showInline) {
      move(this)
    }
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  /**
   * Subscribes to a picker event. Listeners receive `(startDate, endDate, chosenLabel)`
   * for `change`, and the picker instance for lifecycle events (`show`/`hide`/`apply`/`cancel`/`clear`).
   *
   * Events bubble from the trigger element, so you can also listen with
   * `element.addEventListener('change', ...)` and read `event.detail` directly.
   *
   * @param {PickerEventName} event
   * @param {(startDate: object|null, endDate: object|null, chosenLabel: string|null) => void} fn
   */
  on(event, fn) {
    const wrapper = (evt) => {
      if (event === 'change' && (!evt?.detail || typeof evt.detail !== 'object')) return

      const detail = evt?.detail && typeof evt.detail === 'object' ? evt.detail : {}
      const { startDate, endDate, chosenLabel } = detail

      fn(startDate, endDate, chosenLabel)
    }

    this._listeners.push({ event, fn, wrapper })
    this.element.addEventListener(event, wrapper)
  }

  /**
   * Like {@link DateRangePicker#on}, but the listener is removed automatically after the
   * first invocation.
   *
   * @param {PickerEventName} event
   * @param {(startDate: object|null, endDate: object|null, chosenLabel: string|null) => void} fn
   */
  once(event, fn) {
    const onceHandler = (...args) => {
      this.off(event, fn)
      fn(...args)
    }

    this.on(event, onceHandler)
    // Replace the stored fn key with the original so off(event, fn) can find it
    this._listeners[this._listeners.length - 1].fn = fn
  }

  /**
   * Removes a listener previously registered with {@link DateRangePicker#on} or
   * {@link DateRangePicker#once}. Pass the same `event` and `fn` reference used when subscribing.
   *
   * @param {PickerEventName} event
   * @param {Function} fn
   */
  off(event, fn) {
    const idx = this._listeners.findIndex((l) => l.event === event && l.fn === fn)

    if (idx !== -1) {
      this.element.removeEventListener(event, this._listeners[idx].wrapper)
      this._listeners.splice(idx, 1)
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Tears down the picker: removes the container from the DOM, detaches every event
   * listener it added (container, document, window, and trigger element), and restores
   * the trigger element's display in inline mode. Call this before discarding the instance.
   */
  remove() {
    if (this.options.showInline) {
      this.element.style.display = ''
    }

    toggleListeners(this, false)
    this.container.remove()

    detachHandlers(this)

    document.removeEventListener('keydown', this._keyboardNavProxy)

    if (this._elementShowHandler) {
      this.element.removeEventListener('click', this._elementShowHandler)
      this.element.removeEventListener('focus', this._elementShowHandler)
      this.element.removeEventListener('keyup', this._elementChangedHandler)
      this.element.removeEventListener('keydown', this._elementKeydownHandler)
    } else if (this._elementToggleHandler) {
      this.element.removeEventListener('click', this._elementToggleHandler)
      this.element.removeEventListener('keydown', this._elementKeydownHandler)
    }

    this._listeners.forEach((l) => {
      this.element.removeEventListener(l.event, l.wrapper)
    })

    this._listeners = []
  }
}

export default DateRangePicker
