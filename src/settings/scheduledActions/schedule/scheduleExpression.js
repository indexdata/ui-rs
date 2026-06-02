// The one place the schedule wire-format lives. Today: 5-field cron, which the
// broker validates via robfig/cron. We will likely move the backend to rrule
// later; when we do, only this file changes (the form keeps producing
// { days, times }, and `times` already carries HH:MM so no data is lost).
//
// Interim simplification: minutes are ignored (floored to :00). That guarantees
// any {days, times} the form can produce maps to a single valid cron expression
// (`0 <hours> * * <dows>`), avoiding the minute/hour cross-product problem.
//
// `days` is an array of cron day-of-week numbers (Sun=0 .. Sat=6) — i.e. the
// wire format itself, so day handling here is near-identity. Human-readable day
// names are derived from the locale (see dayName), never stored.

// Display order for the week, Monday-first.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const byWeekOrder = (a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b);

// 2023-01-01 was a Sunday (cron dow 0); offsetting by the dow gives a date that
// falls on that weekday, which we hand to Intl for a localized name.
const dowRefDate = (dow) => new Date(Date.UTC(2023, 0, 1 + dow));
export const dayName = (intl, dow, weekday = 'short') => intl.formatDate(
  dowRefDate(dow),
  { weekday, timeZone: 'UTC' },
);

const pad2 = (n) => `0${n}`.slice(-2);

// Expand a single cron field (one of the comma/range/`*` forms we might read
// back) into a sorted array of integers within [min, max].
const expandField = (field, min, max) => {
  if (field === '*') return [];
  const out = new Set();
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      if (Number.isInteger(lo) && Number.isInteger(hi)) {
        for (let n = lo; n <= hi; n++) if (n >= min && n <= max) out.add(n);
      }
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= min && n <= max) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
};

// { days: [1, 3], times: ['06:00', '13:30'] } -> '0 6,13 * * 1,3'
export function scheduleToExpression({ days = [], times = [] } = {}) {
  const hours = [...new Set(
    times
      .map(t => parseInt(String(t).split(':')[0], 10))
      .filter(h => Number.isInteger(h) && h >= 0 && h <= 23)
  )].sort((a, b) => a - b);

  const dows = [...new Set(days)]
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);

  const hourField = hours.length ? hours.join(',') : '*';
  const dowField = dows.length ? dows.join(',') : '*';
  return `0 ${hourField} * * ${dowField}`;
}

// '0 6,13 * * 1,3' -> { days: [1, 3], times: ['06:00:00', '13:00:00'] }
// Returns null if the expression isn't a parseable 5-field cron.
export function scheduleFromExpression(expression) {
  if (typeof expression !== 'string') return null;
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const [, hourField, , , dowField] = fields;
  const times = expandField(hourField, 0, 23).map(h => `${pad2(h)}:00:00`);
  const days = expandField(dowField, 0, 6).sort(byWeekOrder);

  return { days, times };
}

// Human-readable summary for list/detail display; falls back to the raw string
// if the expression can't be parsed into our weekly model. Localized via the
// passed react-intl object (day names, list joining, and the connector text).
export function describeSchedule(expression, intl) {
  const parsed = scheduleFromExpression(expression);
  if (!parsed || (!parsed.days.length && !parsed.times.length)) return expression || '';
  const days = parsed.days.length
    ? intl.formatList(parsed.days.map(d => dayName(intl, d)), { type: 'unit' })
    : intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.everyDay' });
  const times = intl.formatList(parsed.times.map(t => t.slice(0, 5)), { type: 'unit' });
  return times
    ? intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.scheduleSummary' }, { days, times })
    : days;
}
