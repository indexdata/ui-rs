import React, { useState } from 'react';
import { Field } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import { Label, RepeatableField, Timepicker } from '@folio/stripes/components';

// A new row defaults to midnight (UTC) rather than empty, so the opened dropdown
// lands somewhere sensible. The Z-form is what the Timepicker's parser and our
// cron round-trip both understand; minutes stay :00 to match the converter.
const NEW_TIME_SEED = '00:00:00.000Z';

// Repeatable list of times built on stripes' RepeatableField. Using headLabels
// (a column header) rather than per-field labels makes RepeatableField apply its
// aligned remove-button layout, so the trash icon lines up with the picker.
// Value is an array of time strings; only the hour is used by the converter.
//
// Adding a row pops its Timepicker dropdown open so the user can pick a time
// straight away. We track the just-added index (the new item lands at the end,
// so its index is the pre-push length) and seed showTimepicker on that row only;
// it's cleared on remove so reindexed remounts don't reopen.
const TimesField = ({ name, headLabels, addLabel, timeZone }) => {
  const [addedIndex, setAddedIndex] = useState(null);

  return (
    <FieldArray name={name}>
      {({ fields }) => (
        <RepeatableField
          fields={fields}
          headLabels={<Label tagName="span">{headLabels}</Label>}
          addLabel={addLabel}
          onAdd={() => { setAddedIndex(fields.length); fields.push(NEW_TIME_SEED); }}
          onRemove={(index) => { setAddedIndex(null); fields.remove(index); }}
          renderField={(field, index) => (
            <Field
              name={field}
              component={Timepicker}
              timeZone={timeZone}
              showTimepicker={index === addedIndex}
              marginBottom0
            />
          )}
        />
      )}
    </FieldArray>
  );
};

export default TimesField;
