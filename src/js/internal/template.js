import { decodeHtml, escapeHtml, addClasses } from './helpers.js'
import { parseDateTime } from './dates.js'
import { parseInput, onElementKey } from './input.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Builds the picker container from `options.template` (HTML string or `Element`),
 * falling back to {@link defaultTemplate} when none is provided. Validates the result.
 * @param {DateRangePicker} picker
 * @param {object} options
 * @param {number} calCount Number of calendar panels.
 * @throws {Error} when the template is missing required selectors.
 */
export function buildContainer(picker, options, calCount) {
  if (typeof options.template !== 'string' && !(options.template instanceof Element)) {
    options.template = defaultTemplate(calCount)
  }

  if (options.template instanceof Element) {
    picker.container = options.template
  } else {
    const div = document.createElement('div')

    div.innerHTML = options.template

    picker.container = div.firstElementChild
  }

  validateTemplate(picker)
}

/**
 * Builds the default picker HTML string with `count` calendar panels.
 * @param {number} count
 * @returns {string}
 */
export function defaultTemplate(count) {
  const calendars = Array.from({ length: count }, (_, i) => {
    const classes = ['drp-calendar']

    if (i === 0) {
      classes.push('left')
    }

    if (i === count - 1) {
      classes.push('right')
    }

    return `<div class="${classes.join(' ')}" data-cal-index="${i}"><div class="calendar-table"></div></div>`
  }).join('\n')

  return `
  <div class="daterangepicker" role="dialog" aria-modal="true" aria-label="Date range picker" aria-hidden="true" tabindex="-1">
    <div class="drp-calendar-container">
      <div class="drp-ranges"></div>
      ${calendars}
    </div>
    <div class="drp-time-row">
      <div class="calendar-time left"></div>
      <div class="calendar-time right"></div>
    </div>
    <div class="drp-footer">
      <div class="drp-footer-left">
        <span class="drp-selected"></span>
        <span class="drp-duration"></span>
      </div>
      <div class="drp-footer-right">
        <button class="drp-clear-button" type="button" style="display:none"></button>
        <button class="drp-cancel-button" type="button"></button>
        <button class="drp-apply-button" disabled="disabled" type="button"></button>
      </div>
    </div>
  </div>`
}

/**
 * Ensures the active template contains all required structural elements.
 * @param {DateRangePicker} picker
 * @throws {Error} when one or more required selectors are missing.
 */
export function validateTemplate(picker) {
  const requiredSelectors = [
    '.drp-calendar.left',
    '.drp-calendar.right',
    '.drp-ranges',
    '.drp-selected',
    '.drp-apply-button',
    '.drp-cancel-button',
    '.drp-clear-button'
  ]

  const missing = requiredSelectors.filter((sel) => !picker.container.querySelector(sel))

  if (missing.length) throw new Error(`DateRangePicker: template missing required elements: ${missing.join(', ')}`)
}

/**
 * Applies static CSS classes (direction, layout flags, custom classes) and label text to
 * the picker container. Run once after construction and again from {@link refreshContainer}.
 * @param {DateRangePicker} picker
 * @param {object} options
 */
export function configureContainer(picker, options) {
  picker.container.classList.add(picker.options.locale.direction)

  if (picker.options.showInline) {
    picker.container.classList.add('inline')
  }

  if (picker.options.autoApply) {
    picker.container.classList.add('auto-apply')
  }

  if (picker.options.showCancelButton) {
    picker.container.classList.add('show-cancel')
  }

  if (
    !picker.options.showSelectedDates &&
    !picker.options.showDuration &&
    picker.options.autoApply &&
    !picker.options.showCancelButton &&
    !picker.options.showClearButton
  ) {
    picker.container.classList.add('hide-footer')
  }

  if (typeof options.ranges === 'object') {
    picker.container.classList.add('show-drp-ranges')
  }

  if (picker.options.calendarCount === 1) {
    picker.container.classList.add('single', 'single-calendar')
    picker.container.querySelector('.drp-calendar.left').classList.add('single')
    picker.container.querySelector('.drp-calendar.left').style.display = ''
    picker.container.querySelector('.drp-calendar.right').style.display = 'none'
  }

  if (
    typeof options.ranges === 'undefined' ||
    picker.options.alwaysShowCalendars ||
    picker.options.singleDatePicker ||
    picker.options.calendarCount === 1
  ) {
    picker.container.classList.add('show-calendar')
  }

  picker.container.classList.add(`opens${picker.options.openDirection}`)

  if (picker.options.pickerClasses) {
    addClasses(picker.container, picker.options.pickerClasses)
  }

  picker.container
    .querySelectorAll('.drp-apply-button, .drp-cancel-button, .drp-reset-button, .drp-clear-button')
    .forEach((el) => {
      addClasses(el, picker.options.buttonClasses)
    })

  if (picker.options.applyButtonClasses) {
    addClasses(picker.container.querySelector('.drp-apply-button'), picker.options.applyButtonClasses)
  }

  if (picker.options.cancelButtonClasses) {
    addClasses(picker.container.querySelector('.drp-cancel-button'), picker.options.cancelButtonClasses)
  }

  if (picker.options.showClearButton) {
    const clearBtn = picker.container.querySelector('.drp-clear-button')

    clearBtn.style.display = ''
    clearBtn.innerHTML = picker.options.locale.clearButtonLabel
  }

  picker.container.querySelector('.drp-apply-button').innerHTML = picker.options.locale.applyButtonLabel
  picker.container.querySelector('.drp-cancel-button').innerHTML = picker.options.locale.cancelButtonLabel
}

/**
 * Parses `options.ranges` (flat or grouped), clamps each range against `min`/`maxDate`
 * and `maxDuration`, and renders the ranges list (`<ul>`) inside `.drp-ranges`.
 * @param {DateRangePicker} picker
 * @param {object} options
 */
export function initRanges(picker, options) {
  if (typeof options.ranges !== 'object') return

  const groupedItems = []

  const processRange = (label, dates, group) => {
    let start = parseDateTime(picker, dates[0])
    let end = parseDateTime(picker, dates[1])

    if (!start || !end || !start.isValid || !end.isValid) return

    if (picker.options.minDate && start < picker.options.minDate) {
      start = picker.options.minDate
    }

    let maxDate = picker.options.maxDate

    if (picker.options.maxDuration) {
      const durationMax = start.plus({
        days: picker.options.inclusiveDuration ? picker.options.maxDuration - 1 : picker.options.maxDuration
      })

      if (!maxDate || durationMax < maxDate) {
        maxDate = durationMax
      }
    }

    if (maxDate && end > maxDate) {
      end = maxDate
    }

    const granularity = picker.options.showTimePicker ? 'minute' : 'day'

    if (
      (picker.options.minDate && end.startOf(granularity) < picker.options.minDate.startOf(granularity)) ||
      (maxDate && start.startOf(granularity) > maxDate.startOf(granularity))
    ) {
      return
    }

    const decodedLabel = decodeHtml(label)

    picker.options.ranges[decodedLabel] = [start, end]
    groupedItems.push({ group, label: decodedLabel })
  }

  for (const [key, val] of Object.entries(options.ranges)) {
    if (Array.isArray(val)) {
      processRange(key, val, null)
    } else if (typeof val === 'object' && val !== null) {
      const groupName = decodeHtml(key)

      for (const [rangeName, rangeDates] of Object.entries(val)) {
        if (Array.isArray(rangeDates)) {
          processRange(rangeName, rangeDates, groupName)
        }
      }
    }
  }

  let lastGroup

  const items = groupedItems
    .map(({ group, label }) => {
      if (!(label in picker.options.ranges)) return ''

      let html = ''

      if (group !== lastGroup) {
        lastGroup = group

        if (group !== null) {
          html += `<li class="range-group-header" aria-hidden="true">${escapeHtml(group)}</li>`
        }
      }

      html += `<li data-range-key="${escapeHtml(label)}">${escapeHtml(label)}</li>`

      return html
    })
    .join('')

  const customItem = picker.options.showCustomRange
    ? `<li data-range-key="${escapeHtml(picker.options.locale.customRangeLabel)}">${escapeHtml(picker.options.locale.customRangeLabel)}</li>`
    : ''

  picker.container.querySelector('.drp-ranges').insertAdjacentHTML('afterbegin', `<ul>${items}${customItem}</ul>`)
}

/**
 * Mounts the picker to the configured host element and wires the trigger listeners on the
 * attached element. For inline mode the picker is shown immediately and the host is hidden.
 * @param {DateRangePicker} picker
 */
export function mount(picker) {
  if (picker.options.showInline) {
    picker.element.insertAdjacentElement('afterend', picker.container)
    picker.element.style.display = 'none'
    picker.show()
  } else {
    if (picker.element.matches('input, button')) {
      picker._elementShowHandler = () => picker.show()
      picker._elementChangedHandler = (e) => parseInput(picker, e)
      picker._elementKeydownHandler = (e) => onElementKey(picker, e)
      picker.element.addEventListener('click', picker._elementShowHandler)
      picker.element.addEventListener('focus', picker._elementShowHandler)
      picker.element.addEventListener('keyup', picker._elementChangedHandler)
      picker.element.addEventListener('keydown', picker._elementKeydownHandler)
    } else {
      picker._elementToggleHandler = () => picker.toggle()
      picker._elementKeydownHandler = () => picker.toggle()
      picker.element.addEventListener('click', picker._elementToggleHandler)
      picker.element.addEventListener('keydown', picker._elementKeydownHandler)
    }

    picker.options.appendTo.appendChild(picker.container)
  }
}

/**
 * Re-applies container-level classes and visibility-driven UI flags after runtime option updates.
 * Resets layout/state CSS classes, recreates `_extraCalendars`, then re-runs {@link configureContainer}.
 * @param {DateRangePicker} picker
 * @param {object} [options={}]
 */
export function refreshContainer(picker, options = {}) {
  const resetClasses = [
    'ltr',
    'rtl',
    'inline',
    'auto-apply',
    'show-cancel',
    'hide-footer',
    'show-drp-ranges',
    'single',
    'single-calendar',
    'show-calendar',
    'opensleft',
    'opensright',
    'openscenter'
  ]

  picker.container.classList.remove(...resetClasses)

  const newCalCount = Math.max(2, picker.options.calendarCount)

  picker._extraCalendars = Array.from({ length: newCalCount - 2 }, () => ({}))

  const leftCal = picker.container.querySelector('.drp-calendar.left')
  const rightCal = picker.container.querySelector('.drp-calendar.right')

  if (leftCal) {
    leftCal.classList.remove('single')
    leftCal.style.display = ''
  }

  if (rightCal) {
    rightCal.style.display = ''
  }

  configureContainer(picker, options)

  const clearBtn = picker.container.querySelector('.drp-clear-button')

  if (clearBtn) {
    clearBtn.style.display = picker.options.showClearButton ? '' : 'none'
  }
}
