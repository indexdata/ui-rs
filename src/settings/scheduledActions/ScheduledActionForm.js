import React from 'react';
import { Form, Field } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Accordion,
  AccordionSet,
  Button,
  Col,
  Pane,
  PaneFooter,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';

import DaysOfWeek from './schedule/DaysOfWeek/DaysOfWeek';
import TimesField from './schedule/TimesField';
import actionRegistry from './actions/actionRegistry';

// The common form. The top row pairs the action-type selector with the query;
// a Schedule section holds the days + times; then the per-action params block
// chosen from the registry by the current actionName. Create/Edit supply
// initialValues + onSubmit + labels. Renders a bare Pane — the settings
// framework provides the enclosing Paneset.
const ScheduledActionForm = ({ initialValues, onSubmit, onClose, title, submitLabelId, submitting }) => {
  const intl = useIntl();
  const actionOptions = Object.keys(actionRegistry).map(name => ({
    value: name,
    label: intl.formatMessage({ id: `ui-rs.settings.scheduledActions.action.${name}` }),
  }));

  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      mutators={{ ...arrayMutators }}
    >
      {({ handleSubmit, values, pristine, form }) => {
        const ParamsComponent = actionRegistry[values?.actionName];
        const footer = (
          <PaneFooter
            renderStart={
              <Button
                id="clickable-cancel-scheduled-action"
                buttonStyle="default mega"
                marginBottom0
                onClick={onClose}
              >
                <FormattedMessage id="stripes-core.button.cancel" />
              </Button>
            }
            renderEnd={
              <Button
                id="clickable-save-scheduled-action"
                type="submit"
                buttonStyle="primary mega"
                disabled={pristine || submitting}
                onClick={handleSubmit}
                marginBottom0
              >
                <FormattedMessage id={submitLabelId} />
              </Button>
            }
          />
        );
        return (
          <Pane
            defaultWidth="fill"
            paneTitle={title}
            onClose={onClose}
            dismissible
            footer={footer}
          >
            <form id="scheduled-action-form" onSubmit={handleSubmit}>
              <Row>
                <Col xs={12} md={4}>
                  <Field name="actionName">
                    {({ input }) => (
                      <Select
                        id="scheduled-action-actionName"
                        dataOptions={actionOptions}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.actionName" />}
                        value={input.value}
                        onBlur={input.onBlur}
                        onFocus={input.onFocus}
                        onChange={(e) => {
                          // params are owned by the action type; drop the prior
                          // action's keys so we never submit foreign actionParams
                          input.onChange(e);
                          form.change('actionParams', {});
                        }}
                      />
                    )}
                  </Field>
                </Col>
                <Col xs={12} md={8}>
                  <Field
                    id="scheduled-action-batchQuery"
                    name="batchQuery"
                    component={TextField}
                    label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.batchQuery" />}
                  />
                </Col>
              </Row>

              <AccordionSet>
                <Accordion
                  id="scheduled-action-schedule"
                  label={<FormattedMessage id="ui-rs.settings.scheduledActions.schedule" />}
                >
                  <Row>
                    <Col xs={12} md={8}>
                      <Field
                        id="scheduled-action-days"
                        name="days"
                        component={DaysOfWeek}
                        label={<FormattedMessage id="ui-rs.settings.scheduledActions.field.days" />}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <TimesField
                        name="times"
                        timeZone="UTC"
                        headLabels={<FormattedMessage id="ui-rs.settings.scheduledActions.field.times" />}
                        addLabel={<FormattedMessage id="ui-rs.settings.scheduledActions.addTime" />}
                      />
                    </Col>
                  </Row>
                </Accordion>

                {ParamsComponent && (
                  <Accordion
                    id="scheduled-action-options"
                    label={<FormattedMessage id="ui-rs.settings.scheduledActions.options" />}
                  >
                    <ParamsComponent />
                  </Accordion>
                )}
              </AccordionSet>
            </form>
          </Pane>
        );
      }}
    </Form>
  );
};

export default ScheduledActionForm;
