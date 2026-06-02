import { createIntl } from 'react-intl';
import {
  scheduleToExpression,
  scheduleFromExpression,
  describeSchedule,
} from './scheduleExpression';

const intl = createIntl({
  locale: 'en',
  messages: {
    'ui-rs.settings.scheduledActions.scheduleSummary': '{days} at {times}',
    'ui-rs.settings.scheduledActions.everyDay': 'Every day',
  },
});

describe('scheduleExpression', () => {
  describe('scheduleToExpression', () => {
    it('builds a single 5-field cron from days + times', () => {
      expect(scheduleToExpression({
        days: [1, 2, 3, 4, 5],
        times: ['06:00:00', '13:00:00'],
      })).toBe('0 6,13 * * 1,2,3,4,5');
    });

    it('floors minutes to :00 (minutes are ignored for now)', () => {
      expect(scheduleToExpression({ days: [1], times: ['06:30', '06:45'] }))
        .toBe('0 6 * * 1');
    });

    it('keeps Sunday as cron dow 0 and sorts', () => {
      expect(scheduleToExpression({ days: [0, 1], times: ['09:00'] }))
        .toBe('0 9 * * 0,1');
    });

    it('falls back to * for empty days/times', () => {
      expect(scheduleToExpression({ days: [], times: [] })).toBe('0 * * * *');
    });
  });

  describe('scheduleFromExpression', () => {
    it('parses a comma-list cron back into days + times', () => {
      expect(scheduleFromExpression('0 6,13 * * 1,3')).toEqual({
        days: [1, 3],
        times: ['06:00:00', '13:00:00'],
      });
    });

    it('expands day ranges (e.g. as a hand-written 1-5)', () => {
      expect(scheduleFromExpression('0 6 * * 1-5').days)
        .toEqual([1, 2, 3, 4, 5]);
    });

    it('orders parsed days Monday-first', () => {
      expect(scheduleFromExpression('0 6 * * 0,1').days).toEqual([1, 0]);
    });

    it('returns null for a non 5-field expression', () => {
      expect(scheduleFromExpression('nonsense')).toBeNull();
      expect(scheduleFromExpression('0 6 * *')).toBeNull();
    });
  });

  it('round-trips days + times through cron', () => {
    const input = { days: [1, 3, 0], times: ['06:00:00', '18:00:00'] };
    const back = scheduleFromExpression(scheduleToExpression(input));
    expect(back.days.sort()).toEqual([0, 1, 3]);
    expect(back.times).toEqual(input.times);
  });

  describe('describeSchedule', () => {
    it('renders a localized human-readable summary', () => {
      expect(describeSchedule('0 6,13 * * 1,3', intl)).toBe('Mon, Wed at 06:00, 13:00');
    });

    it('falls back to the raw string when unparseable', () => {
      expect(describeSchedule('@weekly', intl)).toBe('@weekly');
    });
  });
});
