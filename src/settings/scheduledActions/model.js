import { scheduleToExpression, scheduleFromExpression } from './schedule/scheduleExpression';

// Compose the three form sections (action type, schedule, per-action params) plus
// the common batchQuery into the broker's CreateBatchAction / update body.
export function buildBatchActionBody(values = {}) {
  const { actionName, batchQuery, days, times, actionParams } = values;
  return {
    actionName,
    batchQuery,
    schedule: scheduleToExpression({ days, times }),
    actionParams: actionParams ?? {},
  };
}

// Turn a fetched BatchAction record into form initialValues (the inverse of
// buildBatchActionBody).
export function recordToFormValues(record = {}) {
  const schedule = scheduleFromExpression(record.schedule) ?? { days: [], times: [] };
  return {
    actionName: record.actionName,
    batchQuery: record.batchQuery ?? '',
    days: schedule.days,
    times: schedule.times,
    actionParams: record.actionParams ?? {},
  };
}
