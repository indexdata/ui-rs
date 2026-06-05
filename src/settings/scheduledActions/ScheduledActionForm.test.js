import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import ScheduledActionForm from './ScheduledActionForm';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => ({})));

const baseInitial = {
  actionName: 'email-pullslips',
  days: [],
  hours: '',
  minute: 0,
  batchQuery: '',
  actionParams: { attachPdf: false },
};

const messages = {
  'ui-rs.settings.scheduledActions.action.email-pullslips': 'Email pull slips',
  'ui-rs.settings.scheduledActions.action.age-requests': 'Age requests',
  'ui-rs.settings.scheduledActions.params.attachPdf': 'Attach pull slip PDF to email',
  'ui-rs.settings.scheduledActions.validate.batchQuery': 'Enter a query',
  'ui-rs.settings.scheduledActions.validate.days': 'Select at least one day',
  'ui-rs.settings.scheduledActions.validate.hoursRequired': 'Enter at least one hour',
  'ui-rs.settings.scheduledActions.validate.hoursInvalid': 'Use comma-separated hours 0–23',
  'ui-rs.settings.scheduledActions.validate.minute': 'Enter minutes 0–59',
};

const byId = (id) => document.getElementById(id);
const save = () => byId('clickable-save-scheduled-action');

// Populate the three things a valid schedule needs: a query, an hour, and a day.
const fillRequired = () => {
  fireEvent.change(byId('scheduled-action-batchQuery'), { target: { value: 'state==REQ' } });
  fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
};

const renderForm = (onSubmit, initialValues = baseInitial) => renderWithRs(
  <ScheduledActionForm
    initialValues={initialValues}
    onSubmit={onSubmit}
    onClose={() => {}}
    title="Test"
    submitLabelId="ui-rs.create"
  />,
  { messages },
);

describe('ScheduledActionForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disables save until the query, an hour and a day are valid', async () => {
    renderForm(jest.fn());

    expect(save()).toBeDisabled();
    fillRequired();
    await waitFor(() => expect(save()).not.toBeDisabled());

    // An out-of-range hour re-disables it.
    fireEvent.change(byId('scheduled-action-hours'), { target: { value: '24' } });
    await waitFor(() => expect(save()).toBeDisabled());

    // A minute of 60+ also re-disables it.
    fireEvent.change(byId('scheduled-action-hours'), { target: { value: '9' } });
    fireEvent.change(byId('scheduled-action-minute'), { target: { value: '60' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('includes the schedule fields and attachPdf in the submit payload', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fillRequired();
    fireEvent.change(byId('scheduled-action-minute'), { target: { value: '30' } });
    fireEvent.click(screen.getByLabelText('Attach pull slip PDF to email'));

    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('email-pullslips');
    expect(values.days).toEqual([1]);
    expect(values.hours).toBe('9');
    expect(values.minute).toBe('30');
    expect(values.actionParams.attachPdf).toBe(true);
  });

  it('swaps the params block and discards the prior action\'s params on action change', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    // Set an email-only param, then switch to a different action type.
    fireEvent.click(screen.getByLabelText('Attach pull slip PDF to email'));
    fireEvent.change(byId('scheduled-action-actionName'), { target: { value: 'age-requests' } });

    // The email block is replaced by the age-requests block...
    await waitFor(() => expect(byId('scheduled-action-age-standard')).toBeInTheDocument());
    expect(screen.queryByLabelText('Attach pull slip PDF to email')).toBeNull();

    // ...and the discarded param doesn't leak into the submitted payload.
    fillRequired();
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('age-requests');
    expect(values.actionParams).not.toHaveProperty('attachPdf');
  });
});
