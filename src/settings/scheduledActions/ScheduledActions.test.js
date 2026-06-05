import React from 'react';
import { Route } from 'react-router-dom';
import { screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../test/renderWithRs';
import { makeOkapiKyMock } from '../../test/okapiKyMock';
import ScheduledActions from './ScheduledActions';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../../test/stripesCore').makeStripesCoreMock(
  () => mockOkapi,
));

const PATH = '/settings/rs/scheduled-actions';

const messages = {
  'ui-rs.settings.scheduledActions.heading': 'Scheduled actions',
  'ui-rs.settings.scheduledActions.action.email-pullslips': 'Email pull slips',
  'ui-rs.settings.scheduledActions.scheduleSummary': '{days} at {times}',
};

const renderList = () => renderWithRs(
  <Route path={PATH} component={ScheduledActions} />,
  { initialEntries: [PATH], messages },
);

describe('ScheduledActions list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a row per batch action with a readable schedule', async () => {
    mockOkapi.setResponses({
      'broker/batch_actions': {
        about: { count: 1 },
        items: [
          { id: 'a1', actionName: 'email-pullslips', schedule: 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=6,13;BYMINUTE=0', createdAt: '2026-05-01T00:00:00Z' },
        ],
      },
    });

    renderList();

    await waitFor(() => expect(screen.getByText('Email pull slips')).toBeInTheDocument());
    // Schedule RRULE is shown via the human-readable describeSchedule().
    expect(screen.getByText('Mon, Wed at 06:00, 13:00')).toBeInTheDocument();
    // The list queried the broker batch-actions endpoint.
    expect(mockOkapi.mock.calls.some(([path]) => path === 'broker/batch_actions')).toBe(true);
  });
});
