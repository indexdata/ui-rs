import { buildBatchActionBody, recordToFormValues } from './model';

describe('scheduledActions model', () => {
  describe('buildBatchActionBody', () => {
    it('composes action type, schedule, batchQuery and namespaced params', () => {
      expect(buildBatchActionBody({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        days: [1],
        times: ['06:00'],
        actionParams: { attachPdf: true },
      })).toEqual({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        schedule: '0 6 * * 1',
        actionParams: { attachPdf: true },
      });
    });

    it('defaults actionParams to an empty object', () => {
      expect(buildBatchActionBody({ actionName: 'email-pullslips', days: [], times: [] }).actionParams)
        .toEqual({});
    });
  });

  describe('recordToFormValues', () => {
    it('expands a record into form values', () => {
      expect(recordToFormValues({
        actionName: 'email-pullslips',
        schedule: '0 6 * * 1',
        batchQuery: 'state==REQ',
        actionParams: { attachPdf: true },
      })).toEqual({
        actionName: 'email-pullslips',
        batchQuery: 'state==REQ',
        days: [1],
        times: ['06:00:00'],
        actionParams: { attachPdf: true },
      });
    });

    it('defaults batchQuery/actionParams when the GET omits them', () => {
      const values = recordToFormValues({ actionName: 'email-pullslips', schedule: '0 6 * * 1' });
      expect(values.batchQuery).toBe('');
      expect(values.actionParams).toEqual({});
    });
  });
});
