import { decodeHtml, getLocaleDateFormat, getFirstDayOfWeek, getWeekdaysMin, getMonthsShort } from './helpers.js'
import { parseDateTime } from './dates.js'

/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

/**
 * Constructor options for {@link DateRangePicker}.
 * @typedef {object} DateRangePickerOptions
 *
 * @property {boolean} [showInline=false] Render the picker inline (always visible) instead of as a dropdown. Hides the attached element and inserts the calendar in its place.
 * @property {boolean} [showVertical=false] Lay out calendars vertically in a single column instead of horizontally in a row.
 * @property {number} [verticalColumns=1] When `showVertical` is `true`, number of columns of stacked calendars before wrapping. Calendars fill each row left-to-right before moving to the next. Capped at `calendarCount`; values < 1 clamp to 1.
 * @property {boolean} [singleDatePicker=false] Pick a single date instead of a range.
 * @property {boolean} [syncCalendars=true] When `true`, all calendars move together. When `false`, each calendar's month can be changed independently.
 * @property {boolean} [wrapCalendars=false] Allow calendars to wrap onto multiple rows instead of laying out on a single row. Useful when displaying many calendars in a constrained width.
 * @property {number} [calendarCount=2] Number of calendar months to show (1–12).
 * @property {'down'|'up'|'auto'} [dropDirection='auto'] Vertical drop direction.
 * @property {'left'|'right'|'center'} [openDirection='right'] Which side the picker opens on.
 * @property {string|Element} [appendTo='body'] Element (or selector) to append the picker to.
 * @property {boolean} [autoApply=false] When `true`, hide the Apply button and apply the selection immediately on pick.
 * @property {boolean} [closeOnApply=true] Close the picker after applying. When `false`, the picker stays open after the user clicks Apply (or after auto-apply on pick).
 * @property {boolean} [closeOnCancel=true] Close the picker after cancelling. When `false`, the picker stays open after the user clicks Cancel.
 * @property {boolean} [closeOnEsc=true] Close the picker when the user presses Escape.
 * @property {boolean} [cancelOnClose=false] When `true`, closing the picker without applying (outside click or Esc) cancels and reverts the selection.
 * @property {boolean} [autoUpdateInput=true] Write the selection back to the attached `<input>`.
 * @property {string|Element} [template] Custom HTML string or Element to use as the picker container.
 *
 * @property {boolean} [showMonthYearDropdowns=false] Show month/year dropdown menus.
 * @property {boolean} [showWeekNumbers=false] Show locale week numbers.
 * @property {boolean} [showISOWeekNumbers=false] Show ISO-8601 week numbers.
 * @property {boolean} [highlightToday=true] When `true`, adds the `drp-today` CSS class to today's cell.
 * @property {Array|function(object): boolean} [disabledDates] Dates to disable. Either an array of date values or a predicate receiving a Luxon `DateTime`.
 * @property {function(object): string|string[]|false} [dayClassFn=false] Called per day; return CSS class(es) for its cell. Receives a Luxon `DateTime`.
 *
 * @property {string|Date|object} [startDate] Initial start date — formatted string, JS `Date`, or Luxon `DateTime`. When omitted the picker opens with no selection and a blank input.
 * @property {string|Date|object} [endDate] Initial end date. Ignored when `startDate` is not provided.
 * @property {string|Date|object|false} [minDate] Earliest selectable date. Pass `false` to clear a previously set value.
 * @property {string|Date|object|false} [maxDate] Latest selectable date. Pass `false` to clear a previously set value.
 *
 * @property {boolean} [showTimePicker=false] Show time pickers below each calendar.
 * @property {boolean} [timePicker24Hour=false] Use 24-hour format in the time picker.
 * @property {boolean} [timePickerSeconds=false] Show seconds in the time picker.
 * @property {number} [minuteIncrement=1] Minute increment in the time picker.
 *
 * @property {boolean} [inclusiveDuration=true] When `true`, duration counts both the start and end day (e.g. Apr 7–10 = 4 days). When `false`, duration is the elapsed difference (3 days).
 * @property {number|false} [minDuration=false] Minimum selectable span in days.
 * @property {number|false} [maxDuration=false] Maximum selectable span in days.
 * @property {string} [durationFormat] Luxon duration format string. Defaults to `"d 'days'"`, or `"d 'days', h 'hrs'"` when `showTimePicker=true`.
 *
 * @property {Record<string,[*,*]>|Record<string,Record<string,[*,*]>>} [ranges] Predefined date ranges. Flat: `{ 'Today': [start, end] }`. Grouped: `{ 'Group': { 'Label': [start, end] } }`.
 * @property {boolean} [showCustomRange=true] Show a "Custom Range" item in the ranges list.
 * @property {boolean} [alwaysShowCalendars=false] Show calendars even when predefined ranges are defined.
 *
 * @property {boolean} [showSelectedDates=true] Show the selected date range string in the picker footer.
 * @property {boolean} [showDuration=true] Show the selected duration next to the range string.
 * @property {boolean} [showCancelButton=true] Show the Cancel button.
 * @property {boolean} [showClearButton=true] Show a Clear button that resets `startDate`/`endDate` to `null`, empties the input, and fires `clear`.
 *
 * @property {string|string[]} [pickerClasses] CSS class(es) to add to the picker container element.
 * @property {string|string[]} [buttonClasses] CSS class(es) added to all action buttons (Apply, Cancel, and Clear).
 * @property {string|string[]} [applyButtonClasses] Extra CSS class(es) on the Apply button.
 * @property {string|string[]} [cancelButtonClasses] Extra CSS class(es) on the Cancel button.
 * @property {DateRangePickerLocale} [locale] Localisation options.
 *
 * @typedef {object} DateRangePickerLocale
 * @property {string} [applyButtonLabel='Apply'] Apply button label.
 * @property {string} [cancelButtonLabel='Cancel'] Cancel button label.
 * @property {string} [clearButtonLabel='Clear'] Clear button label.
 * @property {string} [customRangeLabel='Custom Range'] Custom range list item label.
 * @property {string[]} [daysOfWeek] Short weekday names, Sun-first. Default: locale-detected.
 * @property {'ltr'|'rtl'} [direction='ltr'] Text direction.
 * @property {number} [firstDay] First day of the week (`0` = Sunday). Default: locale-detected.
 * @property {string} [format] Luxon format string, e.g. `'MM/dd/yyyy'`. Default: locale-detected.
 * @property {string[]} [monthNames] Month names, Jan-first. Default: locale-detected.
 * @property {string} [separator=' - '] Separator between start and end date in the input.
 * @property {string} [weekLabel='W'] Week-number column header.
 */

/**
 * Merges user options into picker runtime options and normalizes values.
 * @param {DateRangePicker} picker
 * @param {DateRangePickerOptions} options
 */
export function applyOptions(picker, options) {
  /** Maps option keys to the `typeof` value required to accept them. */
  const typedOptionKeys = {
    showInline: 'boolean',
    showVertical: 'boolean',
    singleDatePicker: 'boolean',
    syncCalendars: 'boolean',
    wrapCalendars: 'boolean',
    cancelOnClose: 'boolean',
    closeOnApply: 'boolean',
    closeOnCancel: 'boolean',
    autoUpdateInput: 'boolean',
    showMonthYearDropdowns: 'boolean',
    showWeekNumbers: 'boolean',
    showISOWeekNumbers: 'boolean',
    highlightToday: 'boolean',
    showTimePicker: 'boolean',
    timePicker24Hour: 'boolean',
    timePickerSeconds: 'boolean',
    inclusiveDuration: 'boolean',
    showCustomRange: 'boolean',
    alwaysShowCalendars: 'boolean',
    showSelectedDates: 'boolean',
    showDuration: 'boolean',
    autoApply: 'boolean',
    showCancelButton: 'boolean',
    showClearButton: 'boolean',
    closeOnEsc: 'boolean',
    dropDirection: 'string',
    openDirection: 'string'
  }

  for (const [key, type] of Object.entries(typedOptionKeys)) {
    if (typeof options[key] === type) {
      picker.options[key] = options[key]
    }
  }

  if (typeof options.calendarCount === 'number') {
    picker.options.calendarCount = Math.max(1, Math.min(12, Math.round(options.calendarCount)))
  }

  if (typeof options.verticalColumns === 'number' && Number.isFinite(options.verticalColumns)) {
    picker.options.verticalColumns = Math.max(1, Math.round(options.verticalColumns))
  }

  const resolvedAppendTo =
    typeof options.appendTo === 'string' ? document.querySelector(options.appendTo) : options.appendTo

  const currentAppendTo =
    typeof picker.options.appendTo === 'string'
      ? document.querySelector(picker.options.appendTo)
      : picker.options.appendTo

  picker.options.appendTo = resolvedAppendTo || currentAppendTo || document.body

  if (options.disabledDates != null) {
    if (Array.isArray(options.disabledDates)) {
      picker.options.disabledDates = options.disabledDates.map((d) => parseDateTime(picker, d)).filter(Boolean)
    } else if (typeof options.disabledDates === 'function') {
      picker.options.disabledDates = options.disabledDates
    }
  }

  if (typeof options.dayClassFn === 'function') {
    picker.options.dayClassFn = options.dayClassFn
  }

  if (options.startDate != null) {
    picker.options.startDate = parseDateTime(picker, options.startDate)
  }

  if (options.endDate != null) {
    picker.options.endDate = parseDateTime(picker, options.endDate)
  } else if (options.startDate != null) {
    // Default endDate to end-of-day of startDate when only startDate is supplied
    picker.options.endDate = picker.options.startDate.endOf('day')
  }

  if (options.minDate === false) {
    picker.options.minDate = null
  } else if (options.minDate != null) {
    picker.options.minDate = parseDateTime(picker, options.minDate)
  }

  if (options.maxDate === false) {
    picker.options.maxDate = null
  } else if (options.maxDate != null) {
    picker.options.maxDate = parseDateTime(picker, options.maxDate)
  }

  if (picker.options.minDate && picker.options.startDate && picker.options.startDate < picker.options.minDate) {
    picker.options.startDate = picker.options.minDate
  }

  if (picker.options.maxDate && picker.options.endDate && picker.options.endDate > picker.options.maxDate) {
    picker.options.endDate = picker.options.maxDate
  }

  if (picker.options.startDate && picker.options.endDate && picker.options.endDate < picker.options.startDate) {
    picker.options.endDate = picker.options.startDate.endOf('day')
  }

  if (typeof options.minuteIncrement === 'number' && Number.isFinite(options.minuteIncrement)) {
    picker.options.minuteIncrement = Math.max(1, Math.round(options.minuteIncrement))
  }

  if (typeof options.minDuration === 'number' && !picker.options.singleDatePicker) {
    picker.options.minDuration = options.minDuration
  }

  if (typeof options.maxDuration === 'number' && !picker.options.singleDatePicker) {
    picker.options.maxDuration = options.maxDuration
  }

  if (typeof options.durationFormat === 'string') {
    picker.options.durationFormat = options.durationFormat
  } else if (picker.options.showTimePicker) {
    picker.options.durationFormat = "d 'days', h 'hrs'"
  } else {
    picker.options.durationFormat = "d 'days'"
  }

  const classOptionKeys = ['pickerClasses', 'buttonClasses', 'applyButtonClasses', 'cancelButtonClasses']

  for (const key of classOptionKeys) {
    if (options[key] != null) {
      picker.options[key] = [].concat(options[key]).join(' ')
    }
  }

  if (typeof options.locale === 'object') {
    const loc = options.locale
    const localeLabelKeys = ['applyButtonLabel', 'cancelButtonLabel', 'clearButtonLabel']

    for (const key of localeLabelKeys) {
      if (typeof loc[key] === 'string') {
        picker.options.locale[key] = loc[key]
      }
    }

    if (typeof loc.customRangeLabel === 'string') {
      picker.options.locale.customRangeLabel = decodeHtml(loc.customRangeLabel)
    }

    const localeScalarKeys = ['direction', 'firstDay', 'format', 'separator', 'weekLabel']

    for (const key of localeScalarKeys) {
      if (typeof loc[key] === typeof picker.options.locale[key]) {
        picker.options.locale[key] = loc[key]
      }
    }

    if (Array.isArray(loc.daysOfWeek)) {
      const n = picker.options.locale.firstDay

      picker.options.locale.daysOfWeek = [...loc.daysOfWeek.slice(n), ...loc.daysOfWeek.slice(0, n)]
    }

    if (Array.isArray(loc.monthNames)) {
      picker.options.locale.monthNames = loc.monthNames.slice()
    }
  }
}

/** Creates a default options object for DateRangePickerCore with all properties set to their default values. */
export function createDefaultOptions() {
  return {
    showInline: false,
    showVertical: false,
    singleDatePicker: false,
    syncCalendars: true,
    wrapCalendars: false,
    calendarCount: 2,
    verticalColumns: 1,
    dropDirection: 'auto',
    openDirection: 'right',
    appendTo: 'body',
    autoApply: false,
    closeOnApply: true,
    closeOnCancel: true,
    closeOnEsc: true,
    cancelOnClose: false,
    autoUpdateInput: true,

    showMonthYearDropdowns: false,
    showWeekNumbers: false,
    showISOWeekNumbers: false,
    highlightToday: true,
    disabledDates: [],

    startDate: null,
    endDate: null,
    minDate: false,
    maxDate: false,

    showTimePicker: false,
    timePicker24Hour: false,
    timePickerSeconds: false,
    minuteIncrement: 1,

    inclusiveDuration: true,
    minDuration: false,
    maxDuration: false,
    durationFormat: "d 'days'",

    ranges: {},
    showCustomRange: true,
    alwaysShowCalendars: false,

    showSelectedDates: true,
    showDuration: true,
    showCancelButton: true,
    showClearButton: true,

    pickerClasses: '',
    buttonClasses: '',
    applyButtonClasses: '',
    cancelButtonClasses: '',

    locale: {
      applyButtonLabel: 'Apply',
      cancelButtonLabel: 'Cancel',
      clearButtonLabel: 'Clear',
      customRangeLabel: 'Custom Range',
      daysOfWeek: getWeekdaysMin(),
      direction: 'ltr',
      firstDay: getFirstDayOfWeek(),
      format: getLocaleDateFormat(),
      monthNames: getMonthsShort(),
      separator: ' - ',
      weekLabel: 'W'
    }
  }
}
