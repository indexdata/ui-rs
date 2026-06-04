import React from 'react';
import { useIntl } from 'react-intl';
import { Button, Label } from '@folio/stripes/components';
import { WEEK_ORDER, dayName } from '../scheduleExpression';
import css from './DaysOfWeek.css';

// Custom final-form input (see final-form custom-input docs). Value is an array
// of cron day-of-week numbers (Sun=0 .. Sat=6) in Monday-first order. Rendered
// as a row of toggle buttons; the short weekday name shows in the circle while
// the full name is the accessible label, both localized via Intl.
const DaysOfWeek = ({ id, label, required, input }) => {
  const intl = useIntl();
  const { value = [], onChange } = input;
  const selected = new Set(value);

  const toggle = (dow) => {
    const next = new Set(selected);
    if (next.has(dow)) next.delete(dow); else next.add(dow);
    // Re-derive in canonical week order so the stored value is stable.
    onChange(WEEK_ORDER.filter((d) => next.has(d)));
  };

  const labelId = label ? `${id}-label` : undefined;

  return (
    <>
      {label && <Label tagName="span" id={labelId} required={required}>{label}</Label>}
      <div
        className={css.days}
        id={id}
        role="group"
        aria-labelledby={labelId}
      >
        {WEEK_ORDER.map((dow) => (
          <Button
            key={dow}
            buttonStyle={selected.has(dow) ? 'primary' : 'default'}
            marginBottom0
            onClick={() => toggle(dow)}
            aria-pressed={selected.has(dow)}
            aria-label={dayName(intl, dow, 'long')}
          >
            {dayName(intl, dow, 'short')}
          </Button>
        ))}
      </div>
    </>
  );
};

export default DaysOfWeek;
