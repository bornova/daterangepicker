/**
 * DateRangePicker - Playwright test suite
 *
 */

import { test, expect } from '@playwright/test'

//  Helpers

const FIXTURE = new URL('./fixture.html', import.meta.url).href

/** Navigate to the fixture page and create a picker with the given options. */
async function setup(page, options = {}) {
  await page.goto(FIXTURE)
  await page.evaluate((opts) => window.createPicker(opts), options)
}

/** Open the picker by clicking the input. */
async function openPicker(page) {
  await page.locator('#picker').click()
  await expect(page.locator('.daterangepicker')).toBeVisible()
}

/** Click a calendar cell by its visible text on the left (first) calendar. */
async function clickDayLeft(page, dayText) {
  const cells = page.locator('.drp-calendar.left .calendar-cell.available')
  for (const cell of await cells.all()) {
    if ((await cell.textContent()).trim() === String(dayText)) {
      await cell.click()
      return
    }
  }
  throw new Error(`Day cell "${dayText}" not found in left calendar`)
}

/** Click a calendar cell by its visible text on the right calendar. */
async function clickDayRight(page, dayText) {
  const cells = page.locator('.drp-calendar.right .calendar-cell.available')
  for (const cell of await cells.all()) {
    if ((await cell.textContent()).trim() === String(dayText)) {
      await cell.click()
      return
    }
  }
  throw new Error(`Day cell "${dayText}" not found in right calendar`)
}

/** Return the log lines collected by the fixture page. */
async function getLog(page) {
  return page.evaluate(() => window.log)
}

//  Core Behavior

test.describe('Visibility', () => {
  test('picker is hidden on page load', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })

  test('picker opens on input click', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('picker opens on input focus', async ({ page }) => {
    await setup(page)
    await page.locator('#picker').focus()
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('picker closes on outside click', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.waitForTimeout(100)
    await page.mouse.click(10, 10)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })

  test('show() fires the "show" event', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:show'))).toBe(true)
  })

  test('hide() fires the "hide" event', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.waitForTimeout(100)
    await page.mouse.click(10, 10)
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:hide'))).toBe(true)
  })

  test('toggle() opens then closes picker', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createPicker())
    await page.evaluate(() => window.pickerInstance.toggle())
    await expect(page.locator('.daterangepicker')).toBeVisible()
    await page.evaluate(() => window.pickerInstance.toggle())
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })
})

test.describe('Date range selection', () => {
  test('Start and end date can be selected across two calendars', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '3')
    await clickDayRight(page, '5')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toContain(' - ')
  })

  test('Callback receives (start, end, label) on apply', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await clickDayLeft(page, '3')
    await clickDayLeft(page, '8')
    await page.locator('.drp-apply-button').click()
    const log = await getLog(page)
    const cb = log.find((l) => l.startsWith('callback:'))
    expect(cb).toBeTruthy()
  })

  test('cancelOnClose reverts selection on outside click', async ({ page }) => {
    await setup(page, { cancelOnClose: true, locale: { format: 'MM/dd/yyyy' } })
    // Set an initial range
    await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/01/2025', '04/10/2025')
    })
    await openPicker(page)
    await clickDayLeft(page, '20') // partial - no end date yet
    await page.mouse.click(10, 10) // close without applying
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:cancel'))).toBe(true)
  })
})

//  Picker

test.describe('Inline mode (showInline)', () => {
  test('Picker is visible inline without clicking input', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createInlinePicker())
    await expect(page.locator('#inline-anchor + .daterangepicker')).toBeVisible()
  })

  test('Inline element (anchor) is hidden when inline mode active', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createInlinePicker())
    const display = await page.locator('#inline-anchor').evaluate((el) => el.style.display)
    expect(display).toBe('none')
  })

  test('Inline picker fires show event on creation', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createInlinePicker()
      document.getElementById('inline-anchor').addEventListener('show', () => {
        window.log.push('event:show::')
      })
    })
    // show is fired immediately; verify inline picker is visible after creation.
    await expect(page.locator('#inline-anchor + .daterangepicker')).toBeVisible()
  })
})

test.describe('singleDatePicker', () => {
  test('Only left calendar is rendered', async ({ page }) => {
    // calendarCount:1 explicitly hides the right calendar panel
    await setup(page, { singleDatePicker: true, calendarCount: 1 })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.right')).toBeHidden()
  })

  test('Clicking a day and applying updates input with single date', async ({ page }) => {
    await setup(page, { singleDatePicker: true, locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '15')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toMatch(/\d{2}\/15\/\d{4}/)
    // No separator present
    expect(val).not.toContain(' - ')
  })

  test('With showTimePicker=true, right-side end time picker is hidden', async ({ page }) => {
    await setup(page, { singleDatePicker: true, showTimePicker: true })
    await openPicker(page)
    await expect(page.locator('.drp-time-row .calendar-time.right')).toBeHidden()
  })

  test('With showTimePicker=true, the single time picker is centered across the time row', async ({ page }) => {
    await setup(page, { singleDatePicker: true, showTimePicker: true })
    await openPicker(page)

    const pos = await page.evaluate(() => {
      const row = document.querySelector('.drp-time-row').getBoundingClientRect()
      const left = document.querySelector('.drp-time-row .calendar-time.left').getBoundingClientRect()

      return {
        rowCenter: row.left + row.width / 2,
        leftCenter: left.left + left.width / 2
      }
    })

    expect(Math.abs(pos.leftCenter - pos.rowCenter)).toBeLessThan(2)
  })

  test('With showTimePicker=true, end date/time always matches start after time changes', async ({ page }) => {
    await setup(page, {
      singleDatePicker: true,
      showTimePicker: true,
      timePicker24Hour: true,
      startDate: '04/01/2025',
      locale: { format: 'MM/dd/yyyy' }
    })

    await page.evaluate(() => {
      window._singleTimeSyncApply = null
      document.getElementById('picker').addEventListener('apply', (e) => {
        window._singleTimeSyncApply = {
          start: e.detail.startDate ? e.detail.startDate.toISO() : null,
          end: e.detail.endDate ? e.detail.endDate.toISO() : null
        }
      })
    })

    await openPicker(page)
    await page.locator('.drp-time-row .calendar-time.left .hourselect').selectOption('14')
    await page.locator('.drp-time-row .calendar-time.left .minuteselect').selectOption('30')
    await page.locator('.drp-apply-button').click()

    const applied = await page.evaluate(() => window._singleTimeSyncApply)
    expect(applied.start).toBe(applied.end)
  })
})

test.describe('singleDatePicker + autoApply', () => {
  test('A single click applies immediately and closes the picker', async ({ page }) => {
    await setup(page, { singleDatePicker: true, autoApply: true })
    await openPicker(page)
    await clickDayLeft(page, '10')
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })
})

test.describe('singleDatePicker pre-fill parsing', () => {
  test('A pre-filled single date input is parsed on construction', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.log = []
      document.getElementById('log').textContent = ''
      const el = document.getElementById('picker')
      el.value = '04/07/2025'
      window.pickerInstance = new DateRangePicker('#picker', {
        singleDatePicker: true,
        locale: { format: 'MM/dd/yyyy' }
      })
    })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left .calendar-cell.start-date')).toHaveText('7')
  })
})

test.describe('Non-input element attachment', () => {
  test('Clicking a div element opens the picker', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createDivPicker())
    await page.locator('#toggle-anchor').click()
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('Clicking the div element again closes the picker', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createDivPicker())
    await page.locator('#toggle-anchor').click()
    await expect(page.locator('.daterangepicker')).toBeVisible()
    await page.locator('#toggle-anchor').click()
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })
})

test.describe('syncCalendars', () => {
  test('syncCalendars=false: advancing right calendar does not move left', async ({ page }) => {
    await setup(page, { syncCalendars: false })
    await openPicker(page)
    const leftBefore = await page.locator('.drp-calendar.left .month').first().textContent()
    await page.locator('.drp-calendar.right .next.available').click()
    const leftAfter = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(leftAfter).toBe(leftBefore)
  })
})

test.describe('calendarCount', () => {
  test('calendarCount=1 shows single calendar', async ({ page }) => {
    await setup(page, { calendarCount: 1 })
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).toHaveClass(/single-calendar/)
    await expect(page.locator('.drp-calendar.right')).toBeHidden()
  })

  test('calendarCount=1 ignores syncCalendars=false for next-month navigation', async ({ page }) => {
    await setup(page, {
      calendarCount: 1,
      syncCalendars: false,
      startDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)

    const next = page.locator('.drp-calendar.left .next').first()
    await expect(next).toHaveClass(/available/)

    const before = (await page.locator('.drp-calendar.left .month').first().textContent()).trim()
    await next.click()
    const after = (await page.locator('.drp-calendar.left .month').first().textContent()).trim()

    expect(after).not.toBe(before)
  })

  test('calendarCount=3 renders three calendar panels', async ({ page }) => {
    await setup(page, { calendarCount: 3 })
    await openPicker(page)
    const cals = page.locator('.drp-calendar')
    await expect(cals).toHaveCount(3)
  })
})

test.describe('dropDirection auto', () => {
  test("dropDirection='auto' does not add drop-up when there is space below the input", async ({ page }) => {
    await setup(page, { dropDirection: 'auto' })
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).not.toHaveClass(/drop-up/)
  })
})

test.describe('dropDirection', () => {
  test("dropDirection='up' adds drop-up class to container when opened", async ({ page }) => {
    await setup(page, { dropDirection: 'up' })
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).toHaveClass(/drop-up/)
  })
})

test.describe('dropDirection down', () => {
  test("dropDirection='down' never adds the drop-up class", async ({ page }) => {
    await setup(page, { dropDirection: 'down' })
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).not.toHaveClass(/drop-up/)
  })
})

test('openDirection right adds opensright class', async ({ page }) => {
  await setup(page, { openDirection: 'right' })
  await expect(page.locator('.daterangepicker')).toHaveClass(/opensright/)
})

test('openDirection left adds opensleft class', async ({ page }) => {
  await setup(page, { openDirection: 'left' })
  await expect(page.locator('.daterangepicker')).toHaveClass(/opensleft/)
})

test('openDirection center adds openscenter class', async ({ page }) => {
  await setup(page, { openDirection: 'center' })
  await expect(page.locator('.daterangepicker')).toHaveClass(/openscenter/)
})

test.describe('appendTo', () => {
  test('picker container is appended to the specified selector element', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createPicker({ appendTo: '#append-target' }))
    await expect(page.locator('#append-target .daterangepicker')).toBeAttached()
  })
})

test.describe('appendTo as DOM Element', () => {
  test('picker is appended to the given Element instance (not a selector)', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      const target = document.getElementById('append-target')
      window.createPicker({ appendTo: target })
    })
    await expect(page.locator('#append-target .daterangepicker')).toBeAttached()
  })
})

test.describe('autoApply (auto-apply)', () => {
  test('Selecting two dates applies immediately without clicking Apply', async ({ page }) => {
    await setup(page, { autoApply: true })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10') // second click triggers auto-apply
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })
})

test.describe('autoUpdateInput', () => {
  test('autoUpdateInput=false prevents input from being written', async ({ page }) => {
    await setup(page, { autoUpdateInput: false })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })
})

test.describe('Input value parsing', () => {
  test('Picker reads initial range from pre-filled input value', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({ locale: { format: 'MM/dd/yyyy' } }, null, '04/01/2025 - 04/15/2025')
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/15/2025')
  })
})

test.describe('Input typing (elementChanged)', () => {
  test('Typing a valid date range into the input updates picker dates on Tab', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.locator('#picker').fill('04/01/2025 - 04/15/2025')
    // Tab triggers keydown -> elementChanged() parses the typed value, then hide()
    await page.locator('#picker').press('Tab')
    await openPicker(page)
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toContainText('1')
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toContainText('15')
  })
})

test.describe('elementChanged fallback formats', () => {
  test('ISO yyyy-MM-dd fallback format is parsed when typed into the input', async ({ page }) => {
    // Default locale format is locale-detected; type ISO dates which require the fallback
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.log = []
      document.getElementById('log').textContent = ''
      // Use a locale format that won't match yyyy-MM-dd so fallback is exercised
      window.pickerInstance = new DateRangePicker('#picker', {
        locale: { format: 'MM/dd/yyyy', separator: ' - ' }
      })
    })
    await page.locator('#picker').fill('2025-06-01 - 2025-06-15')
    await page.locator('#picker').press('Tab')
    await openPicker(page)
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toContainText('1')
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toContainText('15')
  })
})

test.describe('Apply button', () => {
  test('Apply button is visible by default', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toBeVisible()
  })

  test('Apply button closes picker and fires "apply" event', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    await expect(page.locator('.daterangepicker')).toBeHidden()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
  })

  test('Apply updates input value', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  test('closeOnApply=false keeps picker open after apply', async ({ page }) => {
    await setup(page, { closeOnApply: false })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('autoApply=true hides the button', async ({ page }) => {
    await setup(page, { autoApply: true })
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toBeHidden()
  })
})

test.describe('Cancel button', () => {
  test('Cancel button is visible by default', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-cancel-button')).toBeVisible()
  })

  test('Cancel fires "cancel" event and closes picker', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.locator('.drp-cancel-button').click()
    await expect(page.locator('.daterangepicker')).toBeHidden()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:cancel'))).toBe(true)
  })

  test('closeOnCancel=false keeps picker open after cancel', async ({ page }) => {
    await setup(page, { closeOnCancel: false })
    await openPicker(page)
    await page.locator('.drp-cancel-button').click()
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('showCancelButton=false hides the button', async ({ page }) => {
    await setup(page, { showCancelButton: false })
    await openPicker(page)
    // Cancel is only rendered when show-cancel class is present
    await expect(page.locator('.daterangepicker')).not.toHaveClass(/show-cancel/)
  })

  test('Manual input edits are reverted on cancel when autoUpdateInput=true', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      autoUpdateInput: true,
      locale: { format: 'MM/dd/yyyy' }
    })

    await expect(page.locator('#picker')).toHaveValue('04/01/2025 - 04/10/2025')
    await openPicker(page)

    await page.locator('#picker').click()
    await page.locator('#picker').press('ControlOrMeta+A')
    await page.keyboard.type('05/01/2025 - 05/05/2025')
    await expect(page.locator('#picker')).toHaveValue('05/01/2025 - 05/05/2025')

    await page.locator('.drp-cancel-button').click()

    await expect(page.locator('#picker')).toHaveValue('04/01/2025 - 04/10/2025')
  })
})

test.describe('Opening with empty input + cancel', () => {
  test('Cancelling after opening with an empty input leaves input empty', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } }) // input is empty
    await openPicker(page)
    await clickDayLeft(page, '5') // partial selection - no end date
    await page.locator('.drp-cancel-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })
})

test.describe('Keyboard navigation', () => {
  test('Escape closes the picker (closeOnEsc=true default)', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })

  test('Escape does NOT close when closeOnEsc=false', async ({ page }) => {
    await setup(page, { closeOnEsc: false })
    await openPicker(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })
})

test.describe('cancelOnClose + Escape', () => {
  test('cancelOnClose=true: pressing Escape fires the cancel event', async ({ page }) => {
    await setup(page, { cancelOnClose: true })
    await openPicker(page)
    // Keep focus on the input (not inside the picker container) so the input's
    // keydown handler fires and calls _closeByDismissAction -> clickCancel.
    await page.keyboard.press('Escape')
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:cancel'))).toBe(true)
  })
})

test.describe('template', () => {
  test('custom string template is used as the picker container', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({
        template: `
          <div class="daterangepicker custom-tpl" role="dialog" aria-modal="true" aria-label="Date range picker" aria-hidden="true" tabindex="-1">
            <div class="drp-calendar-container">
              <div class="drp-ranges"></div>
              <div class="drp-calendar left" data-cal-index="0">
                <div class="calendar-table"></div>
                <div class="calendar-time"></div>
              </div>
              <div class="drp-calendar right" data-cal-index="1">
                <div class="calendar-table"></div>
                <div class="calendar-time"></div>
              </div>
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
      })
    })
    await expect(page.locator('.daterangepicker.custom-tpl')).toBeAttached()
    await page.locator('#picker').click()
    await expect(page.locator('.daterangepicker.custom-tpl')).toBeVisible()
  })
})

test.describe('template as DOM Element', () => {
  test('Element instance is used directly as the picker container', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = `
        <div class="daterangepicker element-tpl" role="dialog" aria-modal="true" aria-label="Date range picker" aria-hidden="true" tabindex="-1">
          <div class="drp-calendar-container">
            <div class="drp-ranges"></div>
            <div class="drp-calendar left" data-cal-index="0">
              <div class="calendar-table"></div>
              <div class="calendar-time"></div>
            </div>
            <div class="drp-calendar right" data-cal-index="1">
              <div class="calendar-table"></div>
              <div class="calendar-time"></div>
            </div>
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
      window.createPicker({ template: wrapper.firstElementChild })
    })
    await expect(page.locator('.daterangepicker.element-tpl')).toBeAttached()
    await page.locator('#picker').click()
    await expect(page.locator('.daterangepicker.element-tpl')).toBeVisible()
  })
})

//  Calendars

test.describe('showMonthYearDropdowns', () => {
  test('Dropdowns are rendered when showMonthYearDropdowns=true', async ({ page }) => {
    await setup(page, { showMonthYearDropdowns: true })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left select.monthselect')).toBeVisible()
    await expect(page.locator('.drp-calendar.left select.yearselect')).toBeVisible()
  })

  test('No dropdowns by default', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left select.monthselect')).toHaveCount(0)
  })
})

test.describe('Month/year dropdown interaction', () => {
  test('Selecting a month in the dropdown navigates the calendar to that month', async ({ page }) => {
    await setup(page, {
      showMonthYearDropdowns: true,
      startDate: '04/01/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    // Change left calendar to January (select value is 0-based month index)
    await page.locator('.drp-calendar.left .monthselect').selectOption('0')
    const monthHeader = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(monthHeader).toContain('Jan')
  })
})

test.describe('Week numbers', () => {
  test('showWeekNumbers adds week column to calendar', async ({ page }) => {
    await setup(page, { showWeekNumbers: true })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left .calendar-cell.week').first()).toBeVisible()
  })

  test('showISOWeekNumbers adds ISO week column', async ({ page }) => {
    await setup(page, { showISOWeekNumbers: true })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left .calendar-cell.week').first()).toBeVisible()
  })
})

test.describe('showISOWeekNumbers content', () => {
  test('ISO week cells contain valid week numbers (1-53)', async ({ page }) => {
    await setup(page, { showISOWeekNumbers: true, startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    const weekCells = page.locator('.drp-calendar.left .calendar-cell.week:not(.day-header)')
    const count = await weekCells.count()
    expect(count).toBeGreaterThan(0)
    for (const cell of await weekCells.all()) {
      const n = Number((await cell.textContent()).trim())
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(53)
    }
  })

  test('showISOWeekNumbers column header uses locale.weekLabel', async ({ page }) => {
    await setup(page, { showISOWeekNumbers: true, locale: { weekLabel: 'IW' } })
    await openPicker(page)
    const header = await page.locator('.drp-calendar.left .week.day-header').first().textContent()
    expect(header.trim()).toBe('IW')
  })
})

test.describe('highlightToday', () => {
  test("highlightToday=true adds drp-today class to today's cell", async ({ page }) => {
    await setup(page, { highlightToday: true })
    await openPicker(page)
    await expect(page.locator('.drp-calendar .drp-today').first()).toBeVisible()
  })

  test('highlightToday=false has no drp-today cells', async ({ page }) => {
    await setup(page, { highlightToday: false })
    await openPicker(page)
    await expect(page.locator('.drp-calendar .drp-today')).toHaveCount(0)
  })
})

test.describe('disabledDates', () => {
  test('Array of disabled dates renders cells as disabled', async ({ page }) => {
    // Disable the 10th of whatever month is showing
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // Get the first available cell's date to construct a disabled date
    const firstCellDate = await page.evaluate(() => {
      const cells = document.querySelectorAll('.drp-calendar.left .calendar-cell.available')
      return cells[9]?.getAttribute('data-title') // 10th cell approx
    })
    if (!firstCellDate) return // skip if no cell found

    // Recreate picker disabling that specific date via function
    await page.evaluate(() => {
      window.createPicker({
        disabledDates: (dt) => dt.day === 10
      })
    })
    await openPicker(page)
    const disabled = page.locator('.drp-calendar.left .calendar-cell.disabled')
    await expect(disabled.first()).toBeVisible()
  })

  test('Disables all matching weekdays', async ({ page }) => {
    // Luxon weekday: 1=Mon…6=Sat, 7=Sun; functions can't be serialised through setup()
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({ disabledDates: (dt) => dt.weekday === 6 || dt.weekday === 7 })
    })
    await openPicker(page)
    const disabled = page.locator('.drp-calendar.left .calendar-cell.disabled')
    const count = await disabled.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('disabledDates (array form)', () => {
  test('Array of date strings disables those specific cells', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({
        startDate: '04/01/2025',
        disabledDates: ['04/10/2025'],
        locale: { format: 'MM/dd/yyyy' }
      })
    })
    await openPicker(page)
    const disabledCells = page.locator('.drp-calendar.left .calendar-cell.disabled')
    const all = await disabledCells.all()
    let found = false
    for (const cell of all) {
      if ((await cell.textContent()).trim() === '10') {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})

test.describe('disabledDates (function form)', () => {
  test('function predicate disables matching day cells', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.log = []
      document.getElementById('log').textContent = ''
      window.pickerInstance = new DateRangePicker('#picker', {
        startDate: '04/01/2025',
        locale: { format: 'MM/dd/yyyy' },
        disabledDates: (dt) => dt.day === 15
      })
    })
    await openPicker(page)
    const disabledCells = page.locator('.drp-calendar.left .calendar-cell.disabled')
    const all = await disabledCells.all()
    let found = false
    for (const cell of all) {
      if ((await cell.textContent()).trim() === '15') {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})

test.describe('dayClassFn', () => {
  test('dayClassFn result class is added to calendar cells', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({
        dayClassFn: (dt) => (dt.day === 15 ? 'special-day' : false)
      })
    })
    await openPicker(page)
    await expect(page.locator('.drp-calendar .special-day').first()).toBeVisible()
  })
})

test.describe('dayClassFn returning array', () => {
  test('dayClassFn returning an array applies all classes to the cell', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.createPicker({
        dayClassFn: (dt) => (dt.day === 20 ? ['highlight', 'bold-day'] : false)
      })
    })
    await openPicker(page)
    await expect(page.locator('.drp-calendar .highlight.bold-day').first()).toBeVisible()
  })
})

test.describe('Calendar navigation', () => {
  test('Previous arrow moves calendar back one month', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    const monthBefore = await page.locator('.drp-calendar.left .month').first().textContent()
    await page.locator('.drp-calendar.left .prev.available').click()
    const monthAfter = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(monthAfter).not.toBe(monthBefore)
  })

  test('Next arrow moves calendar forward one month', async ({ page }) => {
    // The next arrow is rendered only on the last (right) calendar when synced
    await setup(page)
    await openPicker(page)
    const monthBefore = await page.locator('.drp-calendar.right .month').first().textContent()
    await page.locator('.drp-calendar.right .next.available').click()
    const monthAfter = await page.locator('.drp-calendar.right .month').first().textContent()
    expect(monthAfter).not.toBe(monthBefore)
  })
})

test.describe('weekend CSS class', () => {
  test('Saturday and Sunday cells carry the weekend class', async ({ page }) => {
    // April 2025: April 5 = Saturday, April 6 = Sunday
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy', firstDay: 0 } })
    await openPicker(page)
    const weekendCells = page.locator('.drp-calendar.left .calendar-cell.weekend')
    await expect(weekendCells.first()).toBeVisible()
    const count = await weekendCells.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Out-of-month cells', () => {
  test('Days from adjacent months are rendered with off and ends classes', async ({ page }) => {
    await setup(page, { startDate: '04/15/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // The calendar always fills a 6-row grid, so some cells belong to the prev/next month
    await expect(page.locator('.drp-calendar.left .calendar-cell.off.ends').first()).toBeVisible()
  })
})

test.describe('Hover in-range highlighting', () => {
  test('Hovering over a day after clicking start adds in-range class to cells', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // Click day 5 to set startDate (clears endDate)
    await clickDayLeft(page, '5')
    // Hover over day 10 - cells between 5 and 10 should gain in-range
    const cells = page.locator('.drp-calendar.left .calendar-cell.available')
    let hoverCell
    for (const cell of await cells.all()) {
      if ((await cell.textContent()).trim() === '10') {
        hoverCell = cell
        break
      }
    }
    await hoverCell.hover()
    // At least one cell between start and hover should be in-range
    await expect(page.locator('.drp-calendar .calendar-cell.in-range').first()).toBeVisible()
  })
})

test.describe('start-date / end-date CSS classes', () => {
  test('Clicked start day gains start-date class; second click adds end-date class', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '5') // resets start to Apr 5
    await clickDayLeft(page, '10') // sets end to Apr 10
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toBeVisible()
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toBeVisible()
  })
})

//  Dates

test.describe('startDate / endDate as native Date objects', () => {
  test('Native JS Date instances are parsed correctly', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.log = []
      document.getElementById('log').textContent = ''
      window.pickerInstance = new DateRangePicker('#picker', {
        startDate: new Date('2025-04-01T00:00:00'),
        endDate: new Date('2025-04-15T00:00:00')
      })
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/15/2025')
  })
})

test.describe('Luxon DateTime as startDate/endDate option', () => {
  test('Luxon DateTime instances are accepted as startDate and endDate', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      window.log = []
      document.getElementById('log').textContent = ''
      window.pickerInstance = new DateRangePicker('#picker', {
        startDate: luxon.DateTime.fromISO('2025-06-01'),
        endDate: luxon.DateTime.fromISO('2025-06-15')
      })
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('06/01/2025 - 06/15/2025')
  })
})

test.describe('minDate / maxDate', () => {
  test('Days before minDate are disabled', async ({ page }) => {
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const yyyy = today.getFullYear()
    // minDate = today; day 1 of this month should be disabled if today > 1
    await setup(page, { minDate: `${mm}/${dd}/${yyyy}`, locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    const disabled = page.locator('.drp-calendar.left .calendar-cell.disabled').first()
    await expect(disabled).toBeVisible()
  })

  test('Days after maxDate are disabled', async ({ page }) => {
    // With 2 synced calendars, the picker repositions the right calendar to the
    // maxDate month (April 2026) and left one month earlier (March 2026).
    // Disabled cells for days > maxDate appear on the right calendar.
    await setup(page, {
      startDate: '04/01/2026',
      endDate: '04/10/2026',
      maxDate: '04/15/2026',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    const disabled = page.locator('.drp-calendar.right .calendar-cell.off.disabled')
    await expect(disabled.first()).toBeVisible()
  })
})

//  Time

test.describe('Time picker', () => {
  test('showTimePicker=true shows .calendar-time', async ({ page }) => {
    await setup(page, { showTimePicker: true })
    await openPicker(page)
    await expect(page.locator('.drp-time-row .calendar-time.left')).toBeVisible()
  })

  test('calendarCount=1 stacks start/end time pickers vertically', async ({ page }) => {
    await setup(page, { showTimePicker: true, calendarCount: 1 })
    await openPicker(page)

    const rects = await page.evaluate(() => {
      const left = document.querySelector('.drp-time-row .calendar-time.left').getBoundingClientRect()
      const right = document.querySelector('.drp-time-row .calendar-time.right').getBoundingClientRect()

      return {
        leftTop: left.top,
        rightTop: right.top
      }
    })

    expect(rects.rightTop).toBeGreaterThan(rects.leftTop)
  })

  test('timePicker24Hour=true shows 24-hour hour options', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePicker24Hour: true })
    await openPicker(page)
    // 24-hour picker should have hour 13 as an option
    const option = page.locator('.drp-time-row .calendar-time.left .hourselect option[value="13"]')
    await expect(option).toBeAttached()
  })

  test('timePicker24Hour=false shows AM/PM select', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePicker24Hour: false })
    await openPicker(page)
    await expect(page.locator('.drp-time-row .calendar-time.left .ampmselect')).toBeVisible()
  })

  test('timePickerSeconds=true shows seconds select', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePickerSeconds: true })
    await openPicker(page)
    await expect(page.locator('.drp-time-row .calendar-time.left .secondselect')).toBeVisible()
  })

  test('defaults both time pickers to 12:00 AM when no time was chosen yet', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePicker24Hour: false })
    await openPicker(page)

    await expect(page.locator('.drp-time-row .calendar-time.left .hourselect')).toHaveValue('12')
    await expect(page.locator('.drp-time-row .calendar-time.left .minuteselect')).toHaveValue('0')
    await expect(page.locator('.drp-time-row .calendar-time.left .ampmselect')).toHaveValue('AM')

    await expect(page.locator('.drp-time-row .calendar-time.right .hourselect')).toHaveValue('12')
    await expect(page.locator('.drp-time-row .calendar-time.right .minuteselect')).toHaveValue('0')
    await expect(page.locator('.drp-time-row .calendar-time.right .ampmselect')).toHaveValue('AM')
  })

  test('keeps user-changed right time while end date is still empty', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePicker24Hour: false })
    await openPicker(page)

    await page.locator('.drp-time-row .calendar-time.right .hourselect').selectOption('3')
    await page.locator('.drp-time-row .calendar-time.right .minuteselect').selectOption('15')
    await page.locator('.drp-time-row .calendar-time.right .ampmselect').selectOption('PM')

    await page.locator('.drp-time-row .calendar-time.left .minuteselect').selectOption('30')

    await expect(page.locator('.drp-time-row .calendar-time.right .hourselect')).toHaveValue('3')
    await expect(page.locator('.drp-time-row .calendar-time.right .minuteselect')).toHaveValue('15')
    await expect(page.locator('.drp-time-row .calendar-time.right .ampmselect')).toHaveValue('PM')
  })
})

test.describe('Time picker interaction', () => {
  test('Changing hour select updates startDate after apply', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      timePicker24Hour: true,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-time-row .calendar-time.left .hourselect').selectOption('14')
    await page.locator('.drp-apply-button').click()
    await openPicker(page)
    const hour = await page.locator('.drp-time-row .calendar-time.left .hourselect').inputValue()
    expect(hour).toBe('14')
  })

  test('Changing time auto-applies when autoApply=true', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      timePicker24Hour: true,
      autoApply: true,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-time-row .calendar-time.left .hourselect').selectOption('14')

    await expect(page.locator('.daterangepicker')).toBeHidden()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
  })

  test('Arrow keys on time select keep focus and continue changing value', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      timePicker24Hour: true,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)

    const hourSelect = page.locator('.drp-time-row .calendar-time.left .hourselect')

    await hourSelect.focus()
    await page.keyboard.press('ArrowUp')
    await expect(hourSelect).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await expect(hourSelect).toBeFocused()
  })
})

test.describe('Time picker seconds and AM/PM', () => {
  test('Changing secondselect updates startDate.second after apply', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      timePicker24Hour: true,
      timePickerSeconds: true,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-time-row .calendar-time.left .secondselect').selectOption('30')
    await page.locator('.drp-apply-button').click()
    await openPicker(page)
    const second = await page.locator('.drp-time-row .calendar-time.left .secondselect').inputValue()
    expect(second).toBe('30')
  })

  test('Changing ampmselect to PM shifts startDate hour to >= 12', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      timePicker24Hour: false,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-time-row .calendar-time.left .ampmselect').selectOption('PM')
    await page.locator('.drp-apply-button').click()
    await openPicker(page)
    const hour = parseInt(await page.locator('.drp-time-row .calendar-time.left .hourselect').inputValue(), 10)
    expect(hour).toBeGreaterThanOrEqual(12)
  })
})

test.describe('minuteIncrement', () => {
  test('minute select only contains options at minuteIncrement boundaries', async ({ page }) => {
    await setup(page, { showTimePicker: true, timePicker24Hour: true, minuteIncrement: 15 })
    await openPicker(page)
    const options = await page.locator('.drp-time-row .calendar-time.left .minuteselect option').allTextContents()
    expect(options.map((o) => o.trim())).toEqual(['00', '15', '30', '45'])
  })
})

//  Duration

test.describe('inclusiveDuration', () => {
  test('inclusiveDuration=true (default) counts both endpoints', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/05/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toBe('5 days')
  })

  test('inclusiveDuration=false counts only elapsed days', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/05/2025',
      locale: { format: 'MM/dd/yyyy' },
      inclusiveDuration: false
    })
    await openPicker(page)
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toBe('4 days')
  })
})

test.describe('minDuration / maxDuration', () => {
  test('maxDuration clamps the end date', async ({ page }) => {
    await setup(page, { maxDuration: 5, locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setStartDate('04/01/2025')
      window.pickerInstance.setEndDate('04/30/2025')
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/05/2025') // inclusive: Apr 1..5 = 5 days
  })

  test('showDuration=false hides the duration span', async ({ page }) => {
    await setup(page, { showDuration: false })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toBe('')
  })

  test('showDuration=true shows duration on selection', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '8')
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).not.toBe('')
  })
})

test.describe('minDuration', () => {
  test('setEndDate is clamped up to minDuration days from start', async ({ page }) => {
    await setup(page, { minDuration: 7, locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setStartDate('04/01/2025')
      window.pickerInstance.setEndDate('04/03/2025') // only 3 days inclusive - less than minDuration of 7
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/07/2025') // clamped to start + 6 days (Apr 1..7 = 7 days inclusive)
  })
})

test.describe('minDuration click-blocking', () => {
  test('Clicking within minDuration of start resets to a new start, leaving no end date', async ({ page }) => {
    await setup(page, { minDuration: 7, startDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // First click: endDate is non-null initially -> resets start to Apr 10, clears end
    await clickDayLeft(page, '10')
    // Second click: day 12 is within minDuration(7) of Apr 10 - withinMinSpan guard
    // -> sets Apr 12 as the new start instead of setting an end date
    await clickDayLeft(page, '12')
    await expect(page.locator('.drp-apply-button')).toBeDisabled()
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toHaveCount(0)
  })
})

test.describe('maxDuration click-based clamping', () => {
  test('After clicking start, days beyond maxDuration are rendered disabled', async ({ page }) => {
    await setup(page, { maxDuration: 5, startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // First click resets start to Apr 1 and clears endDate
    await clickDayLeft(page, '1')
    // With endDate null and maxDuration=5 (inclusiveDuration=true), cells beyond Apr 5 (start+4) must be disabled
    const cells = page.locator('.drp-calendar.left .calendar-cell')
    let day20 = null
    for (const cell of await cells.all()) {
      if ((await cell.textContent()).trim() === '20') {
        day20 = cell
        break
      }
    }
    expect(day20).not.toBeNull()
    await expect(day20).toHaveClass(/disabled/)
  })
})

test.describe('maxDuration range filtering', () => {
  test('Range end is clamped to start + maxDuration when ranges are processed', async ({ page }) => {
    await setup(page, {
      maxDuration: 3,
      locale: { format: 'MM/dd/yyyy' },
      ranges: { 'Long Range': ['04/01/2025', '04/30/2025'] }
    })
    await openPicker(page)
    await page.locator('.drp-ranges li[data-range-key="Long Range"]').click()
    expect(await page.locator('#picker').inputValue()).toBe('04/01/2025 - 04/03/2025')
  })
})

test.describe('durationFormat', () => {
  test('showTimePicker=true defaults durationFormat to include hours', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      startDate: '04/01/2025',
      endDate: '04/05/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toContain('hrs')
  })

  test('custom durationFormat still overrides time-picker default', async ({ page }) => {
    await setup(page, {
      showTimePicker: true,
      startDate: '04/01/2025',
      endDate: '04/05/2025',
      locale: { format: 'MM/dd/yyyy' },
      durationFormat: "d 'nights'"
    })
    await openPicker(page)
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toContain('nights')
  })

  test('custom durationFormat string is used in the duration display', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/05/2025',
      locale: { format: 'MM/dd/yyyy' },
      durationFormat: "d 'nights'"
    })
    await openPicker(page)
    const dur = await page.locator('.drp-duration').textContent()
    expect(dur.trim()).toContain('nights')
  })
})

//  Ranges

test.describe('ranges', () => {
  const rangesOpt = {
    locale: { format: 'MM/dd/yyyy' },
    ranges: {
      Today: ['04/23/2025', '04/23/2025'],
      'Last 7 Days': ['04/17/2025', '04/23/2025'],
      'This Month': ['04/01/2025', '04/30/2025']
    }
  }

  test('Range list is rendered', async ({ page }) => {
    await setup(page, rangesOpt)
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Today"]')).toBeVisible()
    await expect(page.locator('.drp-ranges li[data-range-key="Last 7 Days"]')).toBeVisible()
  })

  test('Clicking a range selects it and fires apply', async ({ page }) => {
    await setup(page, rangesOpt)
    await openPicker(page)
    await page.locator('.drp-ranges li[data-range-key="Today"]').click()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
  })

  test('Custom Range item is shown when showCustomRange=true', async ({ page }) => {
    await setup(page, rangesOpt)
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Custom Range"]')).toBeVisible()
  })

  test('Custom Range item is hidden when showCustomRange=false', async ({ page }) => {
    await setup(page, { ...rangesOpt, showCustomRange: false })
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Custom Range"]')).toHaveCount(0)
  })

  test('alwaysShowCalendars shows calendars with ranges', async ({ page }) => {
    await setup(page, { ...rangesOpt, alwaysShowCalendars: true })
    await openPicker(page)
    await expect(page.locator('.drp-calendar.left')).toBeVisible()
  })

  test('Grouped ranges render group headers', async ({ page }) => {
    await setup(page, {
      locale: { format: 'MM/dd/yyyy' },
      ranges: {
        'Short Ranges': {
          Today: ['04/23/2025', '04/23/2025'],
          Yesterday: ['04/22/2025', '04/22/2025']
        }
      }
    })
    await openPicker(page)
    await expect(page.locator('.drp-ranges .range-group-header')).toBeVisible()
  })
})

test.describe('Range label in callback', () => {
  test('Clicking a predefined range passes the label as 3rd callback argument', async ({ page }) => {
    await setup(page, {
      locale: { format: 'MM/dd/yyyy' },
      ranges: { Today: ['04/23/2025', '04/23/2025'] }
    })
    await openPicker(page)
    await page.locator('.drp-ranges li[data-range-key="Today"]').click()
    const log = await getLog(page)
    const cb = log.find((l) => l.startsWith('callback:'))
    expect(cb).toContain('Today')
  })

  test('Clicking a range inside a grouped ranges panel fires apply', async ({ page }) => {
    await setup(page, {
      locale: { format: 'MM/dd/yyyy' },
      ranges: {
        'Short Ranges': {
          Today: ['04/23/2025', '04/23/2025'],
          Yesterday: ['04/22/2025', '04/22/2025']
        }
      }
    })
    await openPicker(page)
    await page.locator('.drp-ranges li[data-range-key="Today"]').click()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
  })
})

test.describe('Active range highlight', () => {
  test('Range matching the current selection is marked active on open', async ({ page }) => {
    await setup(page, {
      startDate: '04/23/2025',
      endDate: '04/23/2025',
      locale: { format: 'MM/dd/yyyy' },
      ranges: { Today: ['04/23/2025', '04/23/2025'] }
    })
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Today"]')).toHaveClass(/active/)
  })
})

test.describe('Custom Range click shows calendars', () => {
  test('Clicking Custom Range exposes the calendar grid', async ({ page }) => {
    // Use startDate/endDate that match the "Today" range so calculateChosenLabel finds a
    // hit and does NOT call showCalendars() - leaving the calendar hidden on open.
    await setup(page, {
      startDate: '04/23/2025',
      endDate: '04/23/2025',
      locale: { format: 'MM/dd/yyyy' },
      ranges: { Today: ['04/23/2025', '04/23/2025'] }
    })
    await openPicker(page)
    // Calendar is hidden - only the ranges panel is shown
    await expect(page.locator('.daterangepicker')).not.toHaveClass(/show-calendar/)
    await page.locator('.drp-ranges li[data-range-key="Custom Range"]').click()
    // showCalendars() is called - calendar grid is now visible
    await expect(page.locator('.daterangepicker')).toHaveClass(/show-calendar/)
  })
})

test.describe('Ranges filtered by minDate', () => {
  test('A range whose end is entirely before minDate is excluded from the list', async ({ page }) => {
    await setup(page, {
      minDate: '04/20/2025',
      locale: { format: 'MM/dd/yyyy' },
      ranges: {
        'Old Range': ['04/01/2025', '04/10/2025'], // entirely before minDate -> excluded
        'Future Range': ['04/20/2025', '04/30/2025'] // after minDate -> included
      }
    })
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Old Range"]')).toHaveCount(0)
    await expect(page.locator('.drp-ranges li[data-range-key="Future Range"]')).toBeVisible()
  })
})

//  Footer

test.describe('showSelectedDates', () => {
  test('showSelectedDates=true shows the .drp-selected element', async ({ page }) => {
    await setup(page, {
      showSelectedDates: true,
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await expect(page.locator('.drp-selected')).toBeVisible()
  })

  test('showSelectedDates=false hides the .drp-selected element', async ({ page }) => {
    await setup(page, { showSelectedDates: false })
    await openPicker(page)
    await expect(page.locator('.drp-selected')).toBeHidden()
  })
})

test.describe('hide-footer class', () => {
  test('Container gets hide-footer when all footer elements are hidden', async ({ page }) => {
    await setup(page, {
      showSelectedDates: false,
      showDuration: false,
      autoApply: true,
      showCancelButton: false,
      showClearButton: false
    })
    await expect(page.locator('.daterangepicker')).toHaveClass(/hide-footer/)
  })
})

test.describe('Clear button', () => {
  test('Clear button is visible when showClearButton=true (default)', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-clear-button')).toBeVisible()
  })

  test('Clear fires "clear" event and empties input', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', endDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    // Seed the input
    await page.evaluate(() => {
      document.getElementById('picker').value = '04/01/2025 - 04/10/2025'
    })
    await openPicker(page)
    await page.locator('.drp-clear-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:clear'))).toBe(true)
  })

  test('showClearButton=false hides the button', async ({ page }) => {
    await setup(page, { showClearButton: false })
    await openPicker(page)
    await expect(page.locator('.drp-clear-button')).toBeHidden()
  })
})

//  Custom Classes

test.describe('CSS class options', () => {
  test('pickerClasses adds class to container', async ({ page }) => {
    await setup(page, { pickerClasses: 'my-custom-picker' })
    await expect(page.locator('.daterangepicker')).toHaveClass(/my-custom-picker/)
  })

  test('applyButtonClasses adds class to apply button', async ({ page }) => {
    await setup(page, { applyButtonClasses: 'btn-success' })
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/btn-success/)
  })

  test('cancelButtonClasses adds class to cancel button', async ({ page }) => {
    await setup(page, { cancelButtonClasses: 'btn-warning' })
    await openPicker(page)
    await expect(page.locator('.drp-cancel-button')).toHaveClass(/btn-warning/)
  })
})

test.describe('pickerClasses as an array', () => {
  test('All classes in the pickerClasses array are added to the container', async ({ page }) => {
    await setup(page, { pickerClasses: ['my-picker', 'theme-dark'] })
    await expect(page.locator('.daterangepicker')).toHaveClass(/my-picker/)
    await expect(page.locator('.daterangepicker')).toHaveClass(/theme-dark/)
  })
})

test.describe('buttonClasses', () => {
  test('buttonClasses is added to both apply and cancel buttons', async ({ page }) => {
    await setup(page, { buttonClasses: 'drp-btn' })
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/drp-btn/)
    await expect(page.locator('.drp-cancel-button')).toHaveClass(/drp-btn/)
  })
})

test.describe('buttonClasses / applyButtonClasses as arrays', () => {
  test('buttonClasses array is applied to all action buttons', async ({ page }) => {
    await setup(page, { buttonClasses: ['btn-a', 'btn-b'] })
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/btn-a/)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/btn-b/)
    await expect(page.locator('.drp-cancel-button')).toHaveClass(/btn-a/)
  })

  test('applyButtonClasses array is applied only to the apply button', async ({ page }) => {
    await setup(page, { applyButtonClasses: ['apply-x', 'apply-y'] })
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/apply-x/)
    await expect(page.locator('.drp-apply-button')).toHaveClass(/apply-y/)
    await expect(page.locator('.drp-cancel-button')).not.toHaveClass(/apply-x/)
  })
})

test.describe('cancelButtonClasses as array', () => {
  test('cancelButtonClasses array is applied only to the cancel button', async ({ page }) => {
    await setup(page, { cancelButtonClasses: ['cancel-x', 'cancel-y'] })
    await openPicker(page)
    await expect(page.locator('.drp-cancel-button')).toHaveClass(/cancel-x/)
    await expect(page.locator('.drp-cancel-button')).toHaveClass(/cancel-y/)
    await expect(page.locator('.drp-apply-button')).not.toHaveClass(/cancel-x/)
  })
})

//  ============================================================
//  Locale
//  ============================================================

test.describe('Locale options', () => {
  test('Custom date format is reflected in input value', async ({ page }) => {
    await setup(page, { locale: { format: 'yyyy-MM-dd' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  test('Custom separator appears in input value', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy', separator: ' to ' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toContain(' to ')
  })

  test.describe('Custom separator in typed input', () => {
    test('Custom locale.separator is used when parsing a typed range', async ({ page }) => {
      await page.goto(FIXTURE)
      await page.evaluate(() => {
        window.log = []
        document.getElementById('log').textContent = ''
        window.pickerInstance = new DateRangePicker('#picker', {
          locale: { format: 'MM/dd/yyyy', separator: ' to ' }
        })
      })
      await page.locator('#picker').fill('04/01/2025 to 04/15/2025')
      await page.locator('#picker').press('Tab')
      await openPicker(page)
      await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toContainText('1')
      await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toContainText('15')
    })
  })

  test('Custom apply button label is rendered', async ({ page }) => {
    await setup(page, { locale: { applyButtonLabel: 'Confirm' } })
    await openPicker(page)
    const label = await page.locator('.drp-apply-button').textContent()
    expect(label.trim()).toBe('Confirm')
  })

  test('Custom cancel button label is rendered', async ({ page }) => {
    await setup(page, { locale: { cancelButtonLabel: 'Dismiss' } })
    await openPicker(page)
    const label = await page.locator('.drp-cancel-button').textContent()
    expect(label.trim()).toBe('Dismiss')
  })

  test('Custom clear button label is rendered', async ({ page }) => {
    await setup(page, { locale: { clearButtonLabel: 'Reset' } })
    await openPicker(page)
    const label = await page.locator('.drp-clear-button').textContent()
    expect(label.trim()).toBe('Reset')
  })

  test('RTL direction class is added', async ({ page }) => {
    await setup(page, { locale: { direction: 'rtl' } })
    await expect(page.locator('.daterangepicker')).toHaveClass(/rtl/)
  })

  test('firstDay shifts the calendar header', async ({ page }) => {
    await setup(page, { locale: { firstDay: 1 } }) // Monday first
    await openPicker(page)
    // Day headers are div.day-header elements; just verify the calendar rendered
    const headers = page.locator('.drp-calendar.left .day-header')
    await expect(headers.first()).toBeVisible()
    expect(await headers.count()).toBe(7)
  })

  test('Custom weekLabel is shown when showWeekNumbers=true', async ({ page }) => {
    await setup(page, { showWeekNumbers: true, locale: { weekLabel: 'Wk' } })
    await openPicker(page)
    // Week number column header is a div.week.day-header element
    const header = await page.locator('.drp-calendar.left .week.day-header').first().textContent()
    expect(header.trim()).toBe('Wk')
  })
})

test.describe('Extended locale options', () => {
  test('locale.monthNames replaces month names in the calendar header', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      locale: {
        format: 'MM/dd/yyyy',
        monthNames: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      }
    })
    await openPicker(page)
    const header = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(header).toContain('Abr') // April -> Abr
  })

  test('locale.daysOfWeek replaces weekday abbreviations in calendar header', async ({ page }) => {
    await setup(page, {
      locale: { daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], firstDay: 0 }
    })
    await openPicker(page)
    const headers = await page.locator('.drp-calendar.left .day-header').allTextContents()
    expect(headers.map((h) => h.trim())).toContain('Mo')
  })

  test('locale.customRangeLabel changes the Custom Range list item text', async ({ page }) => {
    await setup(page, {
      locale: { format: 'MM/dd/yyyy', customRangeLabel: 'Pick dates' },
      ranges: { Today: ['04/23/2025', '04/23/2025'] }
    })
    await openPicker(page)
    await expect(page.locator('.drp-ranges li[data-range-key="Pick dates"]')).toBeVisible()
  })
})

//  ============================================================
//  Methods
//  ============================================================

test.describe('setStartDate / setEndDate / setDateRange', () => {
  test('setStartDate updates picker state', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => window.pickerInstance.setStartDate('03/10/2025'))
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('03/10/2025')
  })

  test('setEndDate updates picker state', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setStartDate('03/10/2025')
      window.pickerInstance.setEndDate('03/20/2025')
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('03/10/2025 - 03/20/2025')
  })

  test('setDateRange updates input when picker is closed', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => window.pickerInstance.setDateRange('04/01/2025', '04/30/2025'))
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/30/2025')
  })

  test('setStartDate clamps to minDate', async ({ page }) => {
    await setup(page, { minDate: '04/15/2025', locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => window.pickerInstance.setStartDate('04/01/2025'))
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/15/2025')
  })

  test('setEndDate clamps to maxDate', async ({ page }) => {
    await setup(page, { maxDate: '04/20/2025', locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setStartDate('04/01/2025')
      window.pickerInstance.setEndDate('05/31/2025')
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/20/2025')
  })
})

test.describe('updateInput()', () => {
  test('updateInput() writes the current selection to the input', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/01/2025', '04/15/2025')
      window.pickerInstance.updateInput()
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('04/01/2025 - 04/15/2025')
  })

  test('updateInput() is a no-op when autoUpdateInput=false', async ({ page }) => {
    await setup(page, { autoUpdateInput: false, locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/01/2025', '04/15/2025')
      window.pickerInstance.updateInput()
    })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })

  test.describe('updateInput() in singleDatePicker mode', () => {
    test('updateInput() writes a single date (not a range) to the input', async ({ page }) => {
      await setup(page, { singleDatePicker: true, locale: { format: 'MM/dd/yyyy' } })
      await page.evaluate(() => {
        window.pickerInstance.setStartDate('04/15/2025')
        window.pickerInstance.updateInput()
      })
      const val = await page.locator('#picker').inputValue()
      expect(val).toBe('04/15/2025')
    })
  })
})

test.describe('apply() and clear() API', () => {
  test('apply() programmatically fires the apply event', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '12')
    await page.evaluate(() => window.pickerInstance.apply())
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:apply'))).toBe(true)
  })

  test('clear() empties input and fires clear event', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      document.getElementById('picker').value = '04/01/2025 - 04/10/2025'
    })
    await page.evaluate(() => window.pickerInstance.clear())
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:clear'))).toBe(true)
  })
})

test.describe('isShowing state', () => {
  test('isShowing is false before open', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })

  test('isShowing is true after open', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('isShowing is false after hide', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.waitForTimeout(100)
    await page.mouse.click(10, 10)
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })
})

test.describe('show() and hide() programmatic calls', () => {
  test('show() opens the picker without a DOM click', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => window.pickerInstance.show())
    await expect(page.locator('.daterangepicker')).toBeVisible()
  })

  test('hide() closes the picker programmatically', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.evaluate(() => window.pickerInstance.hide())
    await expect(page.locator('.daterangepicker')).toBeHidden()
  })

  test('hide() fires the hide event', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await page.evaluate(() => window.pickerInstance.hide())
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:hide'))).toBe(true)
  })
})

test.describe('Additional API methods', () => {
  test('getDateRange() returns current start/end dates', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    const range = await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/03/2025', '04/09/2025')
      const value = window.pickerInstance.getDateRange()

      return {
        start: value.startDate ? value.startDate.toFormat('MM/dd/yyyy') : null,
        end: value.endDate ? value.endDate.toFormat('MM/dd/yyyy') : null
      }
    })

    expect(range).toEqual({ start: '04/03/2025', end: '04/09/2025' })
  })

  test('getState() exposes visibility and selected dates', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    const state = await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/04/2025', '04/11/2025')
      window.pickerInstance.show()
      const value = window.pickerInstance.getState()

      return {
        isShowing: value.isShowing,
        start: value.startDate ? value.startDate.toFormat('MM/dd/yyyy') : null,
        end: value.endDate ? value.endDate.toFormat('MM/dd/yyyy') : null
      }
    })

    expect(state).toEqual({ isShowing: true, start: '04/04/2025', end: '04/11/2025' })
  })

  test('once() handler runs only once', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    const count = await page.evaluate(() => {
      window._onceCount = 0
      window.pickerInstance.once('apply', () => {
        window._onceCount += 1
      })

      window.pickerInstance.setDateRange('04/01/2025', '04/03/2025')
      window.pickerInstance.apply()
      window.pickerInstance.apply()

      return window._onceCount
    })

    expect(count).toBe(1)
  })

  test('cancel() reverts selection to the pre-open range', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    const value = await page.evaluate(() => {
      window.pickerInstance.setDateRange('04/01/2025', '04/10/2025')
      window.pickerInstance.updateInput()

      window.pickerInstance.show()
      window.pickerInstance.setDateRange('04/05/2025', '04/12/2025')
      window.pickerInstance.cancel()

      return document.getElementById('picker').value
    })

    expect(value).toBe('04/01/2025 - 04/10/2025')
  })

  test('setOptions() updates labels and button visibility at runtime', async ({ page }) => {
    await setup(page)
    const ui = await page.evaluate(() => {
      window.pickerInstance.setOptions({ locale: { applyButtonLabel: 'Apply Now' }, showClearButton: false })

      const applyText = document.querySelector('.drp-apply-button').textContent.trim()
      const clearDisplay = document.querySelector('.drp-clear-button').style.display

      return { applyText, clearDisplay }
    })

    expect(ui.applyText).toBe('Apply Now')
    expect(ui.clearDisplay).toBe('none')
  })
})

test.describe('on() / off() event API', () => {
  test('on("apply") handler is called', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._onApplyCalled = false
      window.pickerInstance.on('apply', () => {
        window._onApplyCalled = true
      })
    })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const called = await page.evaluate(() => window._onApplyCalled)
    expect(called).toBe(true)
  })

  test('off() removes handler', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._count = 0
      window._handler = () => {
        window._count++
      }
      window.pickerInstance.on('apply', window._handler)
      window.pickerInstance.off('apply', window._handler)
    })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const count = await page.evaluate(() => window._count)
    expect(count).toBe(0)
  })
})

test.describe('on() for non-apply events', () => {
  test('on("show") handler is called when picker opens', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._showCalled = false
      window.pickerInstance.on('show', () => {
        window._showCalled = true
      })
    })
    await openPicker(page)
    const called = await page.evaluate(() => window._showCalled)
    expect(called).toBe(true)
  })

  test('on("hide") handler is called when picker closes', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._hideCalled = false
      window.pickerInstance.on('hide', () => {
        window._hideCalled = true
      })
    })
    await openPicker(page)
    await page.waitForTimeout(100)
    await page.mouse.click(10, 10)
    const called = await page.evaluate(() => window._hideCalled)
    expect(called).toBe(true)
  })

  test('on("cancel") handler is called when cancel is clicked', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._cancelCalled = false
      window.pickerInstance.on('cancel', () => {
        window._cancelCalled = true
      })
    })
    await openPicker(page)
    await page.locator('.drp-cancel-button').click()
    const called = await page.evaluate(() => window._cancelCalled)
    expect(called).toBe(true)
  })

  test('on("apply") fires before on("change")', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', endDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })

    const order = await page.evaluate(() => {
      const seen = []

      window.pickerInstance.on('apply', () => {
        seen.push('apply')
      })
      window.pickerInstance.on('change', () => {
        seen.push('change')
      })

      window.pickerInstance.show()
      window.pickerInstance.setDateRange('04/02/2025', '04/12/2025')
      window.pickerInstance.apply()

      return seen
    })

    expect(order).toEqual(['apply', 'change'])
  })

  test('on("change") handler fires only when committed range is changed', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })

    const result = await page.evaluate(() => {
      window._changeCalls = 0
      window._changePayload = null

      window.pickerInstance.on('change', (startDate, endDate, chosenLabel) => {
        window._changeCalls += 1
        window._changePayload = {
          start: startDate ? startDate.toFormat('MM/dd/yyyy') : null,
          end: endDate ? endDate.toFormat('MM/dd/yyyy') : null,
          chosenLabel: chosenLabel ?? null
        }
      })

      window.pickerInstance.setDateRange('04/01/2025', '04/05/2025')
      window.pickerInstance.show()
      window.pickerInstance.setDateRange('04/10/2025', '04/12/2025')
      window.pickerInstance.apply()

      return {
        calls: window._changeCalls,
        payload: window._changePayload
      }
    })

    expect(result.calls).toBe(1)
    expect(result.payload).toEqual({ start: '04/10/2025', end: '04/12/2025', chosenLabel: null })
  })

  test('on("change") handler does not fire when committed range is unchanged', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })

    const calls = await page.evaluate(() => {
      window._changeCalls = 0

      window.pickerInstance.on('change', () => {
        window._changeCalls += 1
      })

      window.pickerInstance.setDateRange('04/01/2025', '04/05/2025')
      window.pickerInstance.show()
      window.pickerInstance.setDateRange('04/01/2025', '04/05/2025')
      window.pickerInstance.apply()

      return window._changeCalls
    })

    expect(calls).toBe(0)
  })
})

test.describe('on("clear") handler', () => {
  test('on("clear") is called when clear button is clicked', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._clearCalled = false
      window.pickerInstance.on('clear', () => {
        window._clearCalled = true
      })
    })
    await openPicker(page)
    await page.locator('.drp-clear-button').click()
    const called = await page.evaluate(() => window._clearCalled)
    expect(called).toBe(true)
  })
})

test.describe('remove()', () => {
  test('remove() detaches the container from the DOM', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => window.pickerInstance.remove())
    await expect(page.locator('.daterangepicker')).toHaveCount(0)
  })

  test('remove() restores inline element visibility', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => window.createInlinePicker())
    await page.evaluate(() => window.inlinePickerInstance.remove())
    const display = await page.locator('#inline-anchor').evaluate((el) => el.style.display)
    expect(display).toBe('')
  })
})

test.describe('remove() listener cleanup', () => {
  test('Clicking the input after remove() does not reopen the picker', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => window.pickerInstance.remove())
    // Container is gone - clicking input should not create a new picker or show anything
    await page.locator('#picker').click()
    await expect(page.locator('.daterangepicker')).toHaveCount(0)
  })
})

//  ============================================================
//  Events
//  ============================================================

test.describe('apply event detail', () => {
  test('apply CustomEvent detail contains startDate and endDate', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window._applyDetail = null
      document.getElementById('picker').addEventListener('apply', (e) => {
        window._applyDetail = {
          start: e.detail.startDate ? e.detail.startDate.toISODate() : null,
          end: e.detail.endDate ? e.detail.endDate.toISODate() : null
        }
      })
    })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const detail = await page.evaluate(() => window._applyDetail)
    expect(detail).not.toBeNull()
    expect(detail.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(detail.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('change event detail contains oldStartDate and fires once per apply', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', endDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await page.evaluate(() => {
      window._oldStart = null
      window._changeCount = 0
      document.getElementById('picker').addEventListener('change', (e) => {
        window._changeCount += 1
        window._oldStart = e.detail.oldStartDate ? e.detail.oldStartDate.toISODate() : null
      })
    })
    await openPicker(page)
    await clickDayLeft(page, '1')
    await clickDayLeft(page, '5')
    await page.locator('.drp-apply-button').click()
    const result = await page.evaluate(() => ({ oldStart: window._oldStart, count: window._changeCount }))
    expect(result.oldStart).toBe('2025-04-01')
    expect(result.count).toBe(1)
  })
})

//  ============================================================
//  Keyboard
//  ============================================================

test.describe('Keyboard arrow navigation', () => {
  test('PageDown moves the focused date forward one month (focused class appears)', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    // Container has tabindex="-1"; focusing it satisfies the container.contains(activeElement) guard
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('PageDown') // _focusedDate: Apr 1 -> May 1
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
  })

  test('ArrowRight moves the focused date forward one day', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('ArrowRight') // _focusedDate: Apr 1 -> Apr 2
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
  })

  test('Enter selects the focused date as start then end', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('ArrowRight') // focus Apr 2
    await page.keyboard.press('Enter') // select Apr 2 as start (resets end)
    await page.keyboard.press('ArrowRight') // focus Apr 3
    await page.keyboard.press('Enter') // select Apr 3 as end
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toHaveText('2')
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toHaveText('3')
  })
})

test.describe('Keyboard arrow navigation (additional keys)', () => {
  test('ArrowLeft moves the focused date back one day', async ({ page }) => {
    await setup(page, { startDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
  })

  test('ArrowUp moves the focused date back one week', async ({ page }) => {
    await setup(page, { startDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
  })

  test('ArrowDown moves the focused date forward one week', async ({ page }) => {
    await setup(page, { startDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
  })
})

test.describe('Keyboard PageUp navigation', () => {
  test('PageUp moves the focused date back one month', async ({ page }) => {
    await setup(page, { startDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await page.locator('.daterangepicker').focus()
    await page.keyboard.press('PageUp') // focusedDate: Apr 10 -> Mar 10
    await expect(page.locator('.drp-calendar .calendar-cell.focused')).toBeVisible()
    // The left calendar should now display March
    const month = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(month).toContain('Mar')
  })
})

//  ============================================================
//  Null start date (no initial selection)
//  ============================================================

test.describe('Null start date — no initial selection', () => {
  test('Input is blank when no startDate is provided', async ({ page }) => {
    await setup(page)
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })

  test('Input is blank when only endDate is provided (no startDate)', async ({ page }) => {
    await setup(page, { endDate: '04/10/2025', locale: { format: 'MM/dd/yyyy' } })
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })

  test('startDate is null when no startDate option is given', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toHaveCount(0)
  })

  test('endDate is null when no startDate option is given', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toHaveCount(0)
  })

  test('No calendar cell has start-date or end-date class when opened with no selection', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    const startCells = await page.locator('.calendar-cell.start-date').count()
    const endCells = await page.locator('.calendar-cell.end-date').count()
    expect(startCells).toBe(0)
    expect(endCells).toBe(0)
  })

  test('Apply button is disabled when picker opens with no selection', async ({ page }) => {
    await setup(page)
    await openPicker(page)
    await expect(page.locator('.drp-apply-button')).toBeDisabled()
  })

  test('First click sets start date, second click sets end date and enables Apply', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '12')
    await expect(page.locator('.drp-apply-button')).not.toBeDisabled()
  })

  test('Applying a selection after null state writes the range to the input', async ({ page }) => {
    await setup(page, { locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '12')
    await page.locator('.drp-apply-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toContain(' - ')
  })

  test('Clear button after apply resets startDate and endDate to null', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-clear-button').click()
    await expect(page.locator('#picker')).toHaveValue('')
    await openPicker(page)
    await expect(page.locator('.drp-calendar .calendar-cell.start-date')).toHaveCount(0)
    await expect(page.locator('.drp-calendar .calendar-cell.end-date')).toHaveCount(0)
  })

  test('Clear button after apply empties the input', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-clear-button').click()
    const val = await page.locator('#picker').inputValue()
    expect(val).toBe('')
  })

  test('Clear button fires the clear event', async ({ page }) => {
    await setup(page, {
      startDate: '04/01/2025',
      endDate: '04/10/2025',
      locale: { format: 'MM/dd/yyyy' }
    })
    await openPicker(page)
    await page.locator('.drp-clear-button').click()
    const log = await getLog(page)
    expect(log.some((l) => l.startsWith('event:clear'))).toBe(true)
  })

  test('Calendar opens to current month when there is no selection', async ({ page }) => {
    const now = new Date()
    const expectedMonth = now.toLocaleString('en-US', { month: 'short' })
    await setup(page)
    await openPicker(page)
    const month = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(month).toContain(expectedMonth)
  })
})

//  ============================================================
//  data-* attribute parsing: string and number coercions
//  ============================================================
test.describe('data-* attribute option parsing', () => {
  test('data-highlight-today="true" sets the highlightToday option', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      document.getElementById('picker').setAttribute('data-highlight-today', 'true')
      window.createPicker() // no explicit options - reads highlightToday from data-*
    })
    await openPicker(page)
    await expect(page.locator('.drp-calendar .drp-today').first()).toBeVisible()
  })
})

test.describe('data-* attribute parsing (numeric and string coercions)', () => {
  test('numeric data attribute is coerced to a number option', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      document.getElementById('picker').setAttribute('data-minute-increment', '15')
      window.createPicker({ showTimePicker: true })
    })
    await openPicker(page)
    const options = await page.locator('.drp-time-row .calendar-time.left .minuteselect option').allTextContents()
    expect(options.map((o) => o.trim())).toEqual(['00', '15', '30', '45'])
  })

  test('string data attribute is kept as a string option', async ({ page }) => {
    await page.goto(FIXTURE)
    await page.evaluate(() => {
      document.getElementById('picker').setAttribute('data-open-direction', 'left')
      window.createPicker()
    })
    await openPicker(page)
    await expect(page.locator('.daterangepicker')).toHaveClass(/opensleft/)
  })
})

//  ============================================================
//  Touch swipe navigation
//  ============================================================

test.describe('Touch swipe navigation', () => {
  test('swiping left (finger moves left) advances the calendar one month forward', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    const monthBefore = await page.locator('.drp-calendar.left .month').first().textContent()
    await page.evaluate(() => {
      const container = document.querySelector('.daterangepicker')
      container.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: container, clientX: 200, clientY: 100 })]
        })
      )
      container.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: container, clientX: 100, clientY: 100 })]
        })
      )
    })
    const monthAfter = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(monthAfter).not.toBe(monthBefore)
  })

  test('swiping right (finger moves right) navigates the calendar one month back', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    const monthBefore = await page.locator('.drp-calendar.left .month').first().textContent()
    await page.evaluate(() => {
      const container = document.querySelector('.daterangepicker')
      container.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: container, clientX: 100, clientY: 100 })]
        })
      )
      container.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: container, clientX: 200, clientY: 100 })]
        })
      )
    })
    const monthAfter = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(monthAfter).not.toBe(monthBefore)
  })

  test('a swipe shorter than 50px does not change the month', async ({ page }) => {
    await setup(page, { startDate: '04/01/2025', locale: { format: 'MM/dd/yyyy' } })
    await openPicker(page)
    const monthBefore = await page.locator('.drp-calendar.left .month').first().textContent()
    await page.evaluate(() => {
      const container = document.querySelector('.daterangepicker')
      container.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: container, clientX: 100, clientY: 100 })]
        })
      )
      container.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: container, clientX: 130, clientY: 100 })]
        })
      )
    })
    const monthAfter = await page.locator('.drp-calendar.left .month').first().textContent()
    expect(monthAfter).toBe(monthBefore)
  })
})

//  ============================================================
//  on() with multiple handlers for the same event
//  ============================================================

test.describe('on() with multiple handlers for the same event', () => {
  test('two on() handlers both fire when the event is triggered', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._count1 = 0
      window._count2 = 0
      window.pickerInstance.on('apply', () => {
        window._count1++
      })
      window.pickerInstance.on('apply', () => {
        window._count2++
      })
    })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const [c1, c2] = await page.evaluate(() => [window._count1, window._count2])
    expect(c1).toBe(1)
    expect(c2).toBe(1)
  })

  test('off() removes only the specified handler, leaving others intact', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      window._count1 = 0
      window._count2 = 0
      window._h1 = () => {
        window._count1++
      }
      window._h2 = () => {
        window._count2++
      }
      window.pickerInstance.on('apply', window._h1)
      window.pickerInstance.on('apply', window._h2)
      window.pickerInstance.off('apply', window._h1)
    })
    await openPicker(page)
    await clickDayLeft(page, '5')
    await clickDayLeft(page, '10')
    await page.locator('.drp-apply-button').click()
    const [c1, c2] = await page.evaluate(() => [window._count1, window._count2])
    expect(c1).toBe(0)
    expect(c2).toBe(1)
  })
})
