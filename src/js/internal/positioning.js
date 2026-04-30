/** @typedef {import('../DateRangePicker.js').default} DateRangePicker */

const EDGE_MARGIN = 9 // minimum px from viewport edge when container would overflow

/** Shows the calendar grids. Used when the user clicks "Custom Range" in the ranges panel.
 *  @param {DateRangePicker} picker */
export function showCalendars(picker) {
  picker.container.classList.add('show-calendar')
  move(picker)
}

/** Hides the calendar grids, returning to the ranges-only panel.
 *  @param {DateRangePicker} picker */
export function hideCalendars(picker) {
  picker.container.classList.remove('show-calendar')
}

function getOffset(el) {
  const { top, left } = el.getBoundingClientRect()

  return { top: top + window.scrollY, left: left + window.scrollX }
}

function setCss(el, styles) {
  for (const [prop, val] of Object.entries(styles)) {
    el.style[prop] = typeof val === 'number' ? `${val}px` : val
  }
}

/**
 * Repositions the picker container relative to the attached element.
 * Respects `openDirection` (`'left'`/`'right'`/`'center'`) and `dropDirection` (`'down'`/`'up'`/`'auto'`),
 * and clamps the result to stay within the viewport by at least `EDGE_MARGIN` pixels.
 * @param {DateRangePicker} picker
 */
export function move(picker) {
  let dropDirection = picker.options.dropDirection
  let parentOffset = { top: 0, left: 0 }
  let parentRightEdge = window.innerWidth

  if (picker.options.appendTo !== document.body) {
    const off = getOffset(picker.options.appendTo)

    parentOffset = {
      top: off.top - picker.options.appendTo.scrollTop,
      left: off.left - picker.options.appendTo.scrollLeft
    }

    parentRightEdge = picker.options.appendTo.clientWidth + off.left
  }

  const elOff = getOffset(picker.element)
  const belowTop = elOff.top + picker.element.offsetHeight - parentOffset.top
  const aboveTop = elOff.top - picker.container.offsetHeight - parentOffset.top

  let containerTop = belowTop

  if (dropDirection === 'up') {
    containerTop = aboveTop
  } else if (dropDirection === 'auto') {
    // Use viewport-relative coords for the space check so scrolling doesn't
    // confuse document-relative positions with window.innerHeight.
    const elRect = picker.element.getBoundingClientRect()
    const containerH = picker.container.offsetHeight
    const spaceBelow =
      picker.options.appendTo === document.body
        ? window.innerHeight - elRect.bottom
        : picker.options.appendTo.clientHeight - belowTop
    const spaceAbove = picker.options.appendTo === document.body ? elRect.top : elOff.top - parentOffset.top
    const fitsBelow = spaceBelow >= containerH
    const fitsAbove = spaceAbove >= containerH

    // Prefer down. Only drop up when up fits and down doesn't, or when neither fits but
    // up has more available space.
    if (!fitsBelow && (fitsAbove || spaceAbove > spaceBelow)) {
      containerTop = aboveTop
      dropDirection = 'up'
    }
  }

  // pin top and reset horizontal to measure natural width
  setCss(picker.container, { top: containerTop, left: 0, right: 'auto' })

  const containerWidth = picker.container.offsetWidth

  picker.container.classList.toggle('drop-up', dropDirection === 'up')

  if (picker.options.openDirection === 'left') {
    const containerRight = parentRightEdge - elOff.left - picker.element.offsetWidth

    setCss(
      picker.container,
      containerWidth + containerRight > window.innerWidth
        ? { right: 'auto', left: EDGE_MARGIN }
        : { right: containerRight, left: 'auto' }
    )
  } else if (picker.options.openDirection === 'center') {
    const containerLeft = elOff.left - parentOffset.left + picker.element.offsetWidth / 2 - containerWidth / 2

    if (containerLeft < 0) {
      setCss(picker.container, { right: 'auto', left: EDGE_MARGIN })
    } else if (containerLeft + containerWidth > window.innerWidth) {
      setCss(picker.container, { left: 'auto', right: EDGE_MARGIN })
    } else {
      setCss(picker.container, { left: containerLeft, right: 'auto' })
    }
  } else {
    const containerLeft = elOff.left - parentOffset.left

    setCss(
      picker.container,
      containerLeft + containerWidth > window.innerWidth
        ? { left: 'auto', right: EDGE_MARGIN }
        : { left: containerLeft, right: 'auto' }
    )
  }
}
