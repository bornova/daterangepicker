// ── theme toggle ──────────────────────────────────────────────────────────
const THEME_KEY = 'drp-demo-theme'
const THEMES = ['auto', 'light', 'dark']

const ICONS = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/><path d="M12 2a10 10 0 0 1 0 20" stroke-dasharray="3 3"/></svg>`,
  light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
}

function applyTheme(theme) {
  document.documentElement.style.colorScheme = theme === 'auto' ? '' : theme
  const btn = document.getElementById('theme-toggle')
  btn.innerHTML = ICONS[theme] + `<span>${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>`
  btn.title = `Theme: ${theme}`
}

function cycleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'auto'
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
  localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
}

applyTheme(localStorage.getItem(THEME_KEY) || 'auto')
document.getElementById('theme-toggle').addEventListener('click', cycleTheme)
// ─────────────────────────────────────────────────────────────────────────

const DateTime = luxon.DateTime

// ── button trigger example ────────────────────────────────────────────────
const btnTrigger = document.getElementById('btn-trigger')
const btnPicker = new DateRangePicker(btnTrigger, { autoUpdateInput: false })
btnPicker.on('apply', (start, end) => {
  btnTrigger.textContent = `${start.toFormat('MM/dd/yyyy')} - ${end.toFormat('MM/dd/yyyy')}`
})
// ─────────────────────────────────────────────────────────────────────────

// ── data-* example ───────────────────────────────────────────────────────
new DateRangePicker('#data-trigger')
// ─────────────────────────────────────────────────────────────────────────

let picker = null
let pickerInitialized = false
let demoLogListeners = []
let lastAppliedStart = null
let lastAppliedEnd = null
let wasPickerShowing = false
let pickerIsShowing = false
let startDatePicker = null
let endDatePicker = null
let minDatePicker = null
let maxDatePicker = null

const STORAGE_KEY = 'drp-demo-config'

const CHECKBOXES = [
  'showTimePicker',
  'timePicker24Hour',
  'timePickerSeconds',
  'showSelectedDates',
  'showDuration',
  'inclusiveDuration',
  'showMonthYearDropdowns',
  'showWeekNumbers',
  'showISOWeekNumbers',
  'autoUpdateInput',
  'showCustomRange',
  'autoApply',
  'closeOnApply',
  'showCancelButton',
  'singleDatePicker',
  'syncCalendars',
  'wrapCalendars',
  'cancelOnClose',
  'closeOnCancel',
  'showInline',
  'showVertical',
  'ranges',
  'groupedRanges',
  'alwaysShowCalendars',
  'locale',
  'rtl',
  'disabledDates',
  'dayClassFn',
  'highlightToday',
  'showClearButton',
  'closeOnEsc'
]

const INPUTS = [
  'startDate',
  'endDate',
  'minDate',
  'maxDate',
  'durationFormat',
  'minuteIncrement',
  'minDuration',
  'maxDuration',
  'appendTo',
  'pickerClasses',
  'buttonClasses',
  'applyButtonClasses',
  'cancelButtonClasses'
]

const SELECTS = ['openDirection', 'dropDirection', 'calendarCountSelect', 'verticalColumnsSelect']

function el(id) {
  return document.getElementById(id)
}

function val(id) {
  return el(id).value
}

function checked(id) {
  return el(id).checked
}

function saveConfig() {
  const state = {}
  CHECKBOXES.forEach((id) => (state[id] = el(id).checked))
  INPUTS.forEach((id) => (state[id] = el(id).value))
  SELECTS.forEach((id) => (state[id] = el(id).value))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function loadConfig() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const state = JSON.parse(raw)
  CHECKBOXES.forEach((id) => {
    if (id in state && el(id)) el(id).checked = state[id]
  })
  el('groupedRanges').disabled = !el('ranges').checked
  el('rtl').disabled = !el('locale').checked
  INPUTS.forEach((id) => {
    if (id in state && el(id)) el(id).value = state[id]
  })
  SELECTS.forEach((id) => {
    if (id in state && el(id)) el(id).value = state[id]
  })
}

function resetConfig() {
  localStorage.removeItem(STORAGE_KEY)
  const CHECKED_BY_DEFAULT = new Set([
    'closeOnApply',
    'closeOnCancel',
    'showCancelButton',
    'showClearButton',
    'showSelectedDates',
    'showDuration',
    'inclusiveDuration',
    'autoUpdateInput',
    'showCustomRange',
    'syncCalendars',
    'closeOnEsc',
    'highlightToday'
  ])
  CHECKBOXES.forEach((id) => {
    el(id).checked = CHECKED_BY_DEFAULT.has(id)
    if (id === 'groupedRanges') el(id).disabled = true
    if (id === 'rtl') el(id).disabled = true
  })
  INPUTS.forEach((id) => {
    el(id).value = ''
  })
  el('minuteIncrement').value = '1'
  SELECTS.forEach((id) => (el(id).selectedIndex = 0))
  el('calendarCountSelect').value = '2'
  el('verticalColumnsSelect').value = '1'
  initDatePickers()
  updateConfig()
}

document.querySelectorAll('.config-grid input, .config-grid select').forEach((node) => {
  node.addEventListener('change', updateConfig)
})

el('ranges').addEventListener('change', function () {
  el('groupedRanges').disabled = !this.checked
  if (!this.checked) el('groupedRanges').checked = false
})

el('locale').addEventListener('change', function () {
  el('rtl').disabled = !this.checked
  if (!this.checked) el('rtl').checked = false
})

document.querySelector('.config-grid').addEventListener('mousedown', () => {
  wasPickerShowing = pickerIsShowing
})

const DATE_PICKER_OPTS = {
  singleDatePicker: true,
  calendarCount: 1,
  autoApply: true,
  autoUpdateInput: false,
  locale: { format: 'MM/dd/yyyy' }
}

const DATE_PICKER_FORMAT = 'MM/dd/yyyy'

function initDatePickers() {
  if (startDatePicker) startDatePicker.remove()
  if (endDatePicker) endDatePicker.remove()
  if (minDatePicker) minDatePicker.remove()
  if (maxDatePicker) maxDatePicker.remove()

  startDatePicker = new DateRangePicker('#startDate', DATE_PICKER_OPTS)
  endDatePicker = new DateRangePicker('#endDate', DATE_PICKER_OPTS)
  minDatePicker = new DateRangePicker('#minDate', DATE_PICKER_OPTS)
  maxDatePicker = new DateRangePicker('#maxDate', DATE_PICKER_OPTS)
}

initDatePickers()

el('startDate').addEventListener('apply', (e) => {
  el('startDate').value = e.detail.startDate.toFormat(DATE_PICKER_FORMAT)
  updateConfig()
})

el('endDate').addEventListener('apply', (e) => {
  el('endDate').value = e.detail.startDate.toFormat(DATE_PICKER_FORMAT)
  updateConfig()
})

el('minDate').addEventListener('apply', (e) => {
  el('minDate').value = e.detail.startDate.toFormat(DATE_PICKER_FORMAT)
  updateConfig()
})

el('maxDate').addEventListener('apply', (e) => {
  el('maxDate').value = e.detail.startDate.toFormat(DATE_PICKER_FORMAT)
  updateConfig()
})

loadConfig()
updateConfig()

el('reset-config-btn').addEventListener('click', resetConfig)

el('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(el('config-text').value).then(() => {
    const btn = el('copy-btn')
    btn.textContent = 'Copied!'
    setTimeout(() => (btn.textContent = 'Copy'), 1500)
  })
})

el('clear-log-btn').addEventListener('click', () => {
  el('event-log').innerHTML = ''
})

// ── example code copy buttons ─────────────────────────────────────────────
function dedent(text) {
  let lines = text.split('\n')
  // Drop leading and trailing whitespace-only lines.
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(min)).join('\n')
}

document.querySelectorAll('pre.example-code').forEach((pre) => {
  // Normalize whitespace: dedent and strip whitespace text nodes around <code>
  // so indented HTML source doesn't render with leading/trailing blank lines.
  const code = pre.querySelector('code')
  if (code) {
    code.innerHTML = dedent(code.innerHTML)
    pre.replaceChildren(code)
  } else {
    pre.innerHTML = dedent(pre.innerHTML)
  }

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'example-copy-btn'
  btn.textContent = 'Copy'
  btn.setAttribute('aria-label', 'Copy code')
  btn.addEventListener('click', () => {
    const text = (code ? code.textContent : pre.textContent).replace(/\s+$/, '')
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!'
      setTimeout(() => (btn.textContent = 'Copy'), 1500)
    })
  })
  pre.appendChild(btn)
})
// ─────────────────────────────────────────────────────────────────────────

function serializeOptions(options) {
  const funcs = []
  const json = JSON.stringify(
    options,
    (key, value) => {
      if (typeof value === 'function') {
        const idx = funcs.length
        funcs.push(value.toString())
        return `__FN_${idx}__`
      }
      return value
    },
    2
  )
  return json.replace(/"__FN_(\d+)__"/g, (_, i) => funcs[parseInt(i, 10)])
}

function updateConfig() {
  saveConfig()
  const options = {}

  // Picker
  if (checked('showInline')) options.showInline = true
  if (checked('showVertical')) options.showVertical = true
  if (checked('singleDatePicker')) options.singleDatePicker = true
  if (!checked('syncCalendars')) options.syncCalendars = false
  if (checked('wrapCalendars')) options.wrapCalendars = true
  const calendarCount = parseInt(val('calendarCountSelect'), 10)
  if (calendarCount !== 2) options.calendarCount = calendarCount
  const verticalColumns = parseInt(val('verticalColumnsSelect'), 10)
  if (verticalColumns !== 1) options.verticalColumns = verticalColumns
  if (val('dropDirection') !== 'auto') options.dropDirection = val('dropDirection')
  if (val('openDirection') !== 'right') options.openDirection = val('openDirection')
  if (val('appendTo').length) options.appendTo = val('appendTo')
  if (checked('autoApply')) options.autoApply = true
  if (!checked('closeOnApply')) options.closeOnApply = false
  if (!checked('closeOnCancel')) options.closeOnCancel = false
  if (!checked('closeOnEsc')) options.closeOnEsc = false
  if (checked('cancelOnClose')) options.cancelOnClose = true
  if (!checked('autoUpdateInput')) options.autoUpdateInput = false

  // Calendars
  if (checked('showMonthYearDropdowns')) options.showMonthYearDropdowns = true
  if (checked('showWeekNumbers')) options.showWeekNumbers = true
  if (checked('showISOWeekNumbers')) options.showISOWeekNumbers = true
  if (!checked('highlightToday')) options.highlightToday = false
  if (checked('disabledDates')) options.disabledDates = (dt) => dt.weekday > 5
  if (checked('dayClassFn')) options.dayClassFn = (dt) => (dt.weekday > 5 ? 'drp-weekend' : false)

  // Dates
  if (val('startDate').length) options.startDate = val('startDate')
  if (val('endDate').length) options.endDate = val('endDate')
  if (val('minDate').length) options.minDate = val('minDate')
  if (val('maxDate').length) options.maxDate = val('maxDate')

  // Time
  if (checked('showTimePicker')) options.showTimePicker = true
  if (checked('timePicker24Hour')) options.timePicker24Hour = true
  if (checked('timePickerSeconds')) options.timePickerSeconds = true
  if (val('minuteIncrement').length && val('minuteIncrement') !== '1') {
    options.minuteIncrement = parseInt(val('minuteIncrement'), 10)
  }

  // Duration
  if (!checked('inclusiveDuration')) options.inclusiveDuration = false
  if (val('minDuration').length) options.minDuration = parseInt(val('minDuration'), 10)
  if (val('maxDuration').length) options.maxDuration = parseInt(val('maxDuration'), 10)
  if (val('durationFormat').length) options.durationFormat = val('durationFormat')

  // Ranges
  if (checked('ranges')) {
    if (checked('groupedRanges')) {
      options.ranges = {
        Relative: {
          Today: [DateTime.now(), DateTime.now()],
          Yesterday: [DateTime.now().minus({ days: 1 }), DateTime.now().minus({ days: 1 })],
          'Last 7 Days': [DateTime.now().minus({ days: 6 }), DateTime.now()],
          'Last 30 Days': [DateTime.now().minus({ days: 29 }), DateTime.now()]
        },
        'This Period': {
          'This Month': [DateTime.now().startOf('month'), DateTime.now().endOf('month')],
          'This Year': [DateTime.now().startOf('year'), DateTime.now().endOf('year')]
        },
        'Last Period': {
          'Last Month': [
            DateTime.now().minus({ months: 1 }).startOf('month'),
            DateTime.now().minus({ months: 1 }).endOf('month')
          ],
          'Last Year': [
            DateTime.now().minus({ years: 1 }).startOf('year'),
            DateTime.now().minus({ years: 1 }).endOf('year')
          ]
        }
      }
    } else {
      options.ranges = {
        Today: [DateTime.now(), DateTime.now()],
        Yesterday: [DateTime.now().minus({ days: 1 }), DateTime.now().minus({ days: 1 })],
        'Last 7 Days': [DateTime.now().minus({ days: 6 }), DateTime.now()],
        'Last 30 Days': [DateTime.now().minus({ days: 29 }), DateTime.now()],
        'This Month': [DateTime.now().startOf('month'), DateTime.now().endOf('month')],
        'Last Month': [
          DateTime.now().minus({ months: 1 }).startOf('month'),
          DateTime.now().minus({ months: 1 }).endOf('month')
        ]
      }
    }
  }
  if (!checked('showCustomRange')) options.showCustomRange = false
  if (checked('alwaysShowCalendars')) options.alwaysShowCalendars = true

  // Footer
  if (!checked('showSelectedDates')) options.showSelectedDates = false
  if (!checked('showDuration')) options.showDuration = false
  if (!checked('showCancelButton')) options.showCancelButton = false
  if (!checked('showClearButton')) options.showClearButton = false

  // Custom Classes
  if (val('pickerClasses').length) options.pickerClasses = val('pickerClasses')
  if (val('buttonClasses').length) options.buttonClasses = val('buttonClasses')
  if (val('applyButtonClasses').length) options.applyButtonClasses = val('applyButtonClasses')
  if (val('cancelButtonClasses').length) options.cancelButtonClasses = val('cancelButtonClasses')

  // Locale
  if (checked('locale')) {
    options.locale = {
      direction: checked('rtl') ? 'rtl' : 'ltr',
      separator: ' - ',
      applyButtonLabel: 'Uygula',
      cancelButtonLabel: 'İptal',
      clearButtonLabel: 'Temizle',
      customRangeLabel: 'Özel',
      daysOfWeek: ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
      monthNames: [
        'Ocak',
        'Şubat',
        'Mart',
        'Nisan',
        'Mayıs',
        'Haziran',
        'Temmuz',
        'Ağustos',
        'Eylül',
        'Ekim',
        'Kasım',
        'Aralık'
      ],
      firstDay: 1
    }
  }

  el('config-text').value = "picker = new DateRangePicker('#config-demo', " + serializeOptions(options) + ')'

  const wasShowing = wasPickerShowing

  if (picker) picker.remove()

  const initOptions = { ...options }
  if (!initOptions.startDate && lastAppliedStart) initOptions.startDate = lastAppliedStart
  if (!initOptions.endDate && lastAppliedEnd) initOptions.endDate = lastAppliedEnd

  picker = new DateRangePicker('#config-demo', initOptions, () => {})

  const logEvent = (name, detail) => {
    const log = el('event-log')
    const row = document.createElement('div')
    row.className = 'event-log-row'
    const time = DateTime.now().toFormat('HH:mm:ss')
    const dateFmt = (() => {
      const timePart = options.timePicker24Hour
        ? options.timePickerSeconds
          ? 'HH:mm:ss'
          : 'HH:mm'
        : options.timePickerSeconds
          ? 'hh:mm:ss a'
          : 'hh:mm a'
      return `yyyy-MM-dd ${timePart}`
    })()
    let info = ''
    const start = detail?.startDate
    const end = detail?.endDate
    const label = detail?.chosenLabel
    if ((name === 'apply' || name === 'change') && detail?.oldStartDate) {
      const source = name === 'change' && detail?.source ? ` <span style="opacity:0.6">[${detail.source}]</span>` : ''
      info = `<span class="event-log-label">From:</span>${detail.oldStartDate.toFormat(dateFmt)} → ${detail.oldEndDate.toFormat(dateFmt)}<br><span class="event-log-label">To:</span>${detail.startDate.toFormat(dateFmt)} → ${detail.endDate.toFormat(dateFmt)}${label ? ` <span style="opacity:0.6">(${label})</span>` : ''}`
      info += source
    } else {
      if (start) info += start.toFormat(dateFmt)
      if (end) info += ` → ${end.toFormat(dateFmt)}`
      if (label) info += ` <span style="opacity:0.6">(${label})</span>`
    }
    row.innerHTML = `<span class="event-log-time">${time}</span><span class="event-log-name">${name}</span>${info ? `<span class="event-log-info">${info}</span>` : ''}`
    log.prepend(row)
  }

  const demoEl = document.getElementById('config-demo')
  demoLogListeners.forEach(({ name, fn }) => demoEl.removeEventListener(name, fn))
  demoLogListeners = []
  ;['show', 'hide', 'apply', 'change', 'cancel', 'clear'].forEach((name) => {
    const fn = (e) => {
      if (name === 'show') pickerIsShowing = true
      if (name === 'hide' || name === 'apply' || name === 'cancel' || name === 'clear') pickerIsShowing = false
      if (name === 'apply' && e.detail) {
        lastAppliedStart = e.detail.startDate
        lastAppliedEnd = e.detail.endDate
      }
      if (name === 'clear') {
        lastAppliedStart = null
        lastAppliedEnd = null
      }
      logEvent(name, e.detail)
    }
    demoEl.addEventListener(name, fn)
    demoLogListeners.push({ name, fn })
  })

  if (pickerInitialized && wasShowing) picker.show()

  pickerInitialized = true

  document.querySelector('.demo-hint').style.display = checked('showInline') ? 'none' : ''
}

// ── back to top ───────────────────────────────────────────────────────────
const backToTop = document.querySelector('.back-to-top')
window.addEventListener(
  'scroll',
  () => {
    backToTop.style.display = window.scrollY > 200 ? '' : 'none'
  },
  { passive: true }
)
backToTop.style.display = 'none'
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
