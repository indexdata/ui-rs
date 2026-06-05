import { createIntl } from 'react-intl';
import {
  scheduleToExpression,
  scheduleFromExpression,
  describeSchedule,
  isHourListValid,
  isMinuteValid,
} from './scheduleExpression';

const intl = createIntl({
  locale: 'en',
  messages: {
    'ui-rs.settings.scheduledActions.scheduleSummary': '{days} at {times}',
  },
});

describe('scheduleExpression', () => {
  describe('scheduleToExpression', () => {
    it('builds a weekly RRULE from days, hours and a shared minute', () => {
      expect(scheduleToExpression({
        days: [1, 2, 3, 4, 5],
        hours: '6, 13',
        minute: 30,
      })).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=6,13;BYMINUTE=30;BYSECOND=0');
    });

    it('defaults a blank/invalid minute to 0', () => {
      expect(scheduleToExpression({ days: [1], hours: '6', minute: '' }))
        .toBe('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6;BYMINUTE=0;BYSECOND=0');
    });

    it('maps Sunday to SU, sorts and dedupes hours', () => {
      expect(scheduleToExpression({ days: [0, 1], hours: '9, 9, 6', minute: 0 }))
        .toBe('FREQ=WEEKLY;BYDAY=SU,MO;BYHOUR=6,9;BYMINUTE=0;BYSECOND=0');
    });

    it('pins BYSECOND=0 and omits BYDAY/BYHOUR when empty', () => {
      expect(scheduleToExpression({ days: [], hours: '', minute: 0 })).toBe('FREQ=WEEKLY;BYMINUTE=0;BYSECOND=0');
    });
  });

  describe('scheduleFromExpression', () => {
    it('parses a weekly RRULE back into days, an hours string and minute', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30')).toEqual({
        days: [1, 3],
        hours: '6, 13',
        minute: 30,
      });
    });

    it('defaults minute to 0 when BYMINUTE is absent', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=MO;BYHOUR=6').minute).toBe(0);
    });

    it('orders parsed days Monday-first and tolerates ordinal BYDAY codes', () => {
      expect(scheduleFromExpression('FREQ=WEEKLY;BYDAY=2MO,-1SU;BYHOUR=6').days).toEqual([1, 0]);
    });

    it('returns null when the string is not an RRULE we recognize', () => {
      expect(scheduleFromExpression('nonsense')).toBeNull();
      expect(scheduleFromExpression('BYDAY=MO')).toBeNull();
      expect(scheduleFromExpression('')).toBeNull();
    });
  });

  it('round-trips days, hours and minute through RRULE', () => {
    const input = { days: [1, 3, 0], hours: '6, 18', minute: 15 };
    const back = scheduleFromExpression(scheduleToExpression(input));
    expect(back.days.sort()).toEqual([0, 1, 3]);
    expect(back.hours).toBe('6, 18');
    expect(back.minute).toBe(15);
  });

  describe('describeSchedule', () => {
    it('renders a localized summary including the shared minute', () => {
      expect(describeSchedule('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=30', intl))
        .toBe('Mon, Wed at 06:30, 13:30');
    });

    it('falls back to the raw string without a day or hour', () => {
      expect(describeSchedule('FREQ=WEEKLY;BYMINUTE=0', intl)).toBe('FREQ=WEEKLY;BYMINUTE=0');
      expect(describeSchedule('not-a-rrule', intl)).toBe('not-a-rrule');
    });
  });

  describe('validators', () => {
    it('accepts comma/space-delimited hours in 0-23 and rejects others', () => {
      expect(isHourListValid('9, 15')).toBe(true);
      expect(isHourListValid('0,23')).toBe(true);
      expect(isHourListValid('')).toBe(false);
      expect(isHourListValid('9,')).toBe(false);
      expect(isHourListValid('24')).toBe(false);
      expect(isHourListValid('9, x')).toBe(false);
    });

    it('accepts a blank minute or 0-59 and rejects 60+', () => {
      expect(isMinuteValid('')).toBe(true);
      expect(isMinuteValid(0)).toBe(true);
      expect(isMinuteValid('59')).toBe(true);
      expect(isMinuteValid('60')).toBe(false);
      expect(isMinuteValid('x')).toBe(false);
    });
  });
});
