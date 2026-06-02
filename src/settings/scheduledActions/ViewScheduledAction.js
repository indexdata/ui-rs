import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useQueryClient } from 'react-query';
import { Button, ConfirmationModal, KeyValue, Pane } from '@folio/stripes/components';
import { useOkapiKy } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import { describeSchedule } from './schedule/scheduleExpression';

const ViewScheduledAction = ({ history, match, basePath }) => {
  const { id } = match.params;
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const queryClient = useQueryClient();
  const close = () => history.push(basePath);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isSuccess } = useOkapiQuery(`broker/batch_actions/${id}`);

  const onDelete = async () => {
    await okapiKy.delete(`broker/batch_actions/${id}`);
    await queryClient.invalidateQueries('broker/batch_actions');
    close();
  };

  if (!isSuccess) return null;

  const actionLabel = intl.formatMessage({
    id: `ui-rs.settings.scheduledActions.action.${data.actionName}`,
    defaultMessage: data.actionName,
  });

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={actionLabel}
      onClose={close}
      dismissible
      actionMenu={({ onToggle }) => (
        <>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); history.push(`${basePath}/${id}/edit`); }}
          >
            <FormattedMessage id="ui-rs.edit" />
          </Button>
          <Button
            buttonStyle="dropdownItem"
            onClick={() => { onToggle(); setConfirmDelete(true); }}
          >
            <FormattedMessage id="ui-rs.delete" />
          </Button>
        </>
      )}
    >
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.actionName" />}
        value={actionLabel}
      />
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.scheduleUtc" />}
        value={describeSchedule(data.schedule, intl)}
      />
      <KeyValue
        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.batchQuery" />}
        value={data.batchQuery}
      />
      <ConfirmationModal
        open={confirmDelete}
        heading={<FormattedMessage id="ui-rs.settings.scheduledActions.delete.heading" />}
        message={<FormattedMessage id="ui-rs.settings.scheduledActions.delete.message" values={{ name: actionLabel }} />}
        confirmLabel={<FormattedMessage id="ui-rs.delete" />}
        onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Pane>
  );
};

export default ViewScheduledAction;
