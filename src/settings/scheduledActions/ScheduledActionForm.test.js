import React from 'react';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import ScheduledActionForm from './ScheduledActionForm';

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(() => ({})));

const baseInitial = {
  actionName: 'email-pullslips',
  days: [],
  times: [],
  batchQuery: '',
  actionParams: { attachPdf: false },
};

const messages = {
  'ui-rs.settings.scheduledActions.action.email-pullslips': 'Email pull slips',
  'ui-rs.settings.scheduledActions.action.age-requests': 'Age requests',
  'ui-rs.settings.scheduledActions.params.attachPdf': 'Attach pull slip PDF to email',
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

  it('includes actionParams.attachPdf and the selected days in the submit payload', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    fireEvent.click(screen.getByLabelText('Attach pull slip PDF to email'));

    fireEvent.click(document.getElementById('clickable-save-scheduled-action'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('email-pullslips');
    expect(values.days).toEqual([1]);
    expect(values.actionParams.attachPdf).toBe(true);
  });

  it('swaps the per-action params block when the action type changes', async () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText('Attach pull slip PDF to email')).toBeInTheDocument();

    fireEvent.change(
      document.getElementById('scheduled-action-actionName'),
      { target: { value: 'age-requests' } },
    );

    await waitFor(() => expect(screen.queryByLabelText('Attach pull slip PDF to email')).toBeNull());
    expect(document.getElementById('scheduled-action-age-standard')).toBeInTheDocument();
  });

  it('clears the prior action\'s params when the action type changes', async () => {
    const onSubmit = jest.fn();
    renderForm(onSubmit);

    // set an email-only param, then switch to a different action type
    fireEvent.click(screen.getByLabelText('Attach pull slip PDF to email'));
    fireEvent.change(
      document.getElementById('scheduled-action-actionName'),
      { target: { value: 'age-requests' } },
    );

    await waitFor(() => expect(document.getElementById('scheduled-action-age-standard')).toBeInTheDocument());
    fireEvent.click(document.getElementById('clickable-save-scheduled-action'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0];
    expect(values.actionName).toBe('age-requests');
    expect(values.actionParams).not.toHaveProperty('attachPdf');
  });
});
