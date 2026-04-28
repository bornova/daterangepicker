# Date Range Picker

[![npm](https://img.shields.io/npm/v/@bornova/daterangepicker.svg)](https://www.npmjs.com/package/@bornova/daterangepicker)
[![license](https://img.shields.io/npm/l/@bornova/daterangepicker.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@bornova/daterangepicker)](https://bundlephobia.com/package/@bornova/daterangepicker)

A flexible JavaScript date range picker with time pickers, predefined ranges, week numbers, and automatic locale detection - powered by [Luxon](https://moment.github.io/luxon/).

Originally inspired by [dangrossman/daterangepicker](https://github.com/dangrossman/daterangepicker)

[**Live demo & full documentation →**](https://bornova.github.io/daterangepicker/)

## Features

- Single date or date range selection
- Optional time picker (12/24-hour, seconds, minute increments)
- Predefined ranges with optional grouping
- Multi-month view (1–12 calendars)
- Week numbers (locale or ISO)
- Min/max dates, min/max duration, disabled dates
- Keyboard navigation and ARIA roles
- Automatic locale detection (first day of week, month names, date format)
- TypeScript declarations included
- Zero dependencies beyond Luxon

## Requirements

[Luxon](https://moment.github.io/luxon/) 3.x. Installed automatically with npm; for script-tag usage, load it before the picker (see below).

## Installation

```bash
npm install @bornova/daterangepicker
```

## Usage

### ES Module

```javascript
import DateRangePicker from '@bornova/daterangepicker'
import '@bornova/daterangepicker/dist/daterangepicker.css'
```

### Browser (script tag)

Load from a CDN (jsDelivr or unpkg):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@bornova/daterangepicker/dist/daterangepicker.css" />
<script src="https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@bornova/daterangepicker/dist/browser/daterangepicker.min.js"></script>
```

Or via unpkg:

```html
<link rel="stylesheet" href="https://unpkg.com/@bornova/daterangepicker/dist/daterangepicker.css" />
<script src="https://unpkg.com/luxon@3/build/global/luxon.min.js"></script>
<script src="https://unpkg.com/@bornova/daterangepicker/dist/browser/daterangepicker.min.js"></script>
```

Pin to a specific version (recommended for production) by appending `@<version>` to the package name, e.g. `@bornova/daterangepicker@1.0.0`.

## Quick Start

```html
<input type="text" id="daterange" />
```

```javascript
const picker = new DateRangePicker(
  '#daterange',
  {
    startDate: '01/01/2025',
    endDate: '01/31/2025'
  },
  (start, end, chosenLabel) => {
    console.log(start.toISODate(), end.toISODate())
  }
)
```

The constructor accepts a CSS selector or DOM element, an options object, and an optional callback fired on apply. The callback receives Luxon `DateTime` objects for start and end, and the predefined range label (`chosenLabel`, or `null` for a custom range).

## Documentation

For a full list of options, methods, events, and live examples, see the [documentation](https://bornova.github.io/daterangepicker/).
