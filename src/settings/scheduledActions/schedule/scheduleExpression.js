// The one place the schedule wire-format lives. The broker validates the
// schedule as an RRULE string (teambition/rrule-go), e.g.
// "FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30" (every Mon & Wed at 06:30
// and 13:30). The form deals in { days, hours, minute } and only this file
// knows the wire format.
//
// We model a weekly recurrence: FREQ=WEEKLY, the selected weekdays as BYDAY, the
// run hours as BYHOUR, and a single shared minute-past-the-hour as BYMINUTE. A
// single RRULE fires on the cross-product of its BY* lists, so it cannot bind a
// distinct minute to each hour — hence one minute applies to every hour (the
// form makes that explicit rather than faking per-time minutes).
//
// BYSECOND=0 is always pinned: the broker sets Dtstart = now before building the
// rule, and rrule (rrule-go) inherits any unspecified component from Dtstart, so
// without it a "09:00" schedule would fire at 09:00:<creation-second>.
//
// `days` is an array of 0-based day-of-week numbers (Sun=0 .. Sat=6) — the same
// numbering JS Date.getDay() uses; only this file translates them to/from RRULE
// BYDAY codes. `hours` is a user-entered comma-delimited string ("9, 15") so the
// form can validate the raw text. Human-readable day names are derived from the
// locale (see dayName), never stored.

// Display order for the week, Monday-first.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const byWeekOrder = (a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b);

// RRULE BYDAY codes indexed by 0-based day-of-week (Sun=0 .. Sat=6).
const DOW_TO_RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const RRULE_TO_DOW = Object.fromEntries(DOW_TO_RRULE.map((code, dow) => [code, dow]));

// 2023-01-01 was a Sunday (dow 0); offsetting by the dow gives a date that falls
// on that weekday, which we hand to Intl for a localized name.
const dowRefDate = (dow) => new Date(Date.UTC(2023, 0, 1 + dow));
export const dayName = (intl, dow, weekday = 'short') => intl.formatDate(
  dowRefDate(dow),
  { weekday, timeZone: 'UTC' },
);

// Parse the comma/space-delimited hours string into a sorted, deduped list of
// integers within [0, 23]. Anything unparseable is dropped.
const parseHourList = (hours) => [...new Set(
  String(hours)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(h => Number.isInteger(h) && h >= 0 && h <= 23)
)].sort((a, b) => a - b);

// Coerce a minute-past-the-hour to an integer in [0, 59]; blank/invalid -> 0.
const toMinute = (m) => {
  const n = parseInt(m, 10);
  return Number.isInteger(n) && n >= 0 && n <= 59 ? n : 0;
};

// Validators shared with the form so the parsing rules live in one place.
// A valid hours string is non-empty and every comma-separated token is an
// integer in [0, 23].
export const isHourListValid = (hours) => {
  const tokens = String(hours).split(',').map(t => t.trim());
  if (!tokens.length || tokens.some(t => t === '')) return false;
  return tokens.every(t => /^\d+$/.test(t) && Number(t) <= 23);
};

// A valid minute is blank (defaults to 0) or an integer in [0, 59].
export const isMinuteValid = (minute) => {
  const s = String(minute).trim();
  if (s === '') return true;
  return /^\d+$/.test(s) && Number(s) <= 59;
};

// Parse a wire RRULE into numeric { days, hours, minute }; null if it isn't an
// RRULE we recognize (must have FREQ).
const parseExpression = (expression) => {
  if (typeof expression !== 'string') return null;
  const parts = expression.trim().split(';').filter(Boolean);
  if (!parts.length) return null;
  const rule = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) return null;
    rule[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  if (!rule.FREQ) return null;

  // BYDAY codes may carry an ordinal prefix (e.g. 2MO, -1FR); we don't model
  // those, so strip it and keep the weekday.
  const days = (rule.BYDAY ? rule.BYDAY.split(',') : [])
    .map(code => RRULE_TO_DOW[code.trim().toUpperCase().replace(/^[+-]?\d+/, '')])
    .filter(n => Number.isInteger(n))
    .sort(byWeekOrder);

  const hours = parseHourList(rule.BYHOUR ?? '');
  const minute = toMinute(rule.BYMINUTE ? rule.BYMINUTE.split(',')[0] : 0);

  return { days, hours, minute };
};

// { days: [1, 3], hours: '6, 13', minute: 30 }
//   -> 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30;BYSECOND=0'
export function scheduleToExpression({ days = [], hours = '', minute = 0 } = {}) {
  const hourList = parseHourList(hours);
  const dows = [...new Set(days)]
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  const parts = ['FREQ=WEEKLY'];
  if (dows.length) parts.push(`BYDAY=${dows.map(d => DOW_TO_RRULE[d]).join(',')}`);
  if (hourList.length) parts.push(`BYHOUR=${hourList.join(',')}`);
  parts.push(`BYMINUTE=${toMinute(minute)}`);
  parts.push('BYSECOND=0');
  return parts.join(';');
}

// 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30'
//   -> { days: [1, 3], hours: '6, 13', minute: 30 }
// Returns null if the string isn't an RRULE we recognize.
export function scheduleFromExpression(expression) {
  const parsed = parseExpression(expression);
  if (!parsed) return null;
  return { days: parsed.days, hours: parsed.hours.join(', '), minute: parsed.minute };
}

// Human-readable summary for list/detail display; falls back to the raw string
// if the expression can't be parsed into our weekly model (which requires at
// least one day and one hour). Localized via the passed react-intl object.
export function describeSchedule(expression, intl) {
  const parsed = parseExpression(expression);
  if (!parsed || !parsed.days.length || !parsed.hours.length) return expression || '';
  const days = intl.formatList(parsed.days.map(d => dayName(intl, d)), { type: 'unit' });
  const mm = String(parsed.minute).padStart(2, '0');
  const times = intl.formatList(
    parsed.hours.map(h => `${String(h).padStart(2, '0')}:${mm}`),
    { type: 'unit' },
  );
  return intl.formatMessage(
    { id: 'ui-rs.settings.scheduledActions.scheduleSummary' },
    { days, times },
  );
}
