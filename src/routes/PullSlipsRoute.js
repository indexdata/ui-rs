import React, { useContext, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useOkapiKy } from '@folio/stripes/core';
import { MessageBanner, Pane, Paneset } from '@folio/stripes/components';
import { useCloseDirect } from '@projectreshare/stripes-reshare';
import AppNameContext from '../AppNameContext';
import { buildPatronRequestsCql } from './buildPatronRequestsCql';
import parseErrRes from '../util/parseErrRes';

const PullSlipsRoute = () => {
  const appName = useContext(AppNameContext);
  const location = useLocation();
  const intl = useIntl();
  const okapiKy = useOkapiKy();
  const close = useCloseDirect();
  const [pdfUrl, setPdfUrl] = useState();
  const [errMsg, setErrMsg] = useState(null);
  const title = intl.formatMessage({ id: 'ui-rs.pullSlips' });

  const cql = buildPatronRequestsCql(location);
  const side = appName === 'supply' ? 'lending' : 'borrowing';
  const urlParams = queryString.parse(location.search);
  const hasFilter = Boolean(urlParams.query || urlParams.filters);

  const pdfQuery = useQuery({
    queryKey: ['broker/pullslips', cql, side],
    queryFn: () => okapiKy.post('broker/pullslips', {
      json: { cql },
      searchParams: { side },
    }).blob(),
    enabled: hasFilter,
    retry: false,
  });

  useEffect(() => {
    if (pdfQuery.isSuccess && !pdfUrl) {
      setPdfUrl(URL.createObjectURL(pdfQuery.data));
    }
  }, [pdfQuery.isSuccess, pdfQuery.data, pdfUrl]);

  useEffect(() => {
    if (pdfQuery.isError) {
      parseErrRes(pdfQuery.error).then(setErrMsg);
    }
  }, [pdfQuery.isError, pdfQuery.error]);

  return (
    <Paneset>
      <Pane
        defaultWidth="100%"
        onClose={close}
        dismissible
        paneTitle={title}
      >
        {!hasFilter && (
          <MessageBanner type="error">
            {intl.formatMessage({ id: 'ui-rs.pullSlip.noFilter' })}
          </MessageBanner>
        )}
        {hasFilter && pdfQuery.isError && (
          <MessageBanner type="error">
            {intl.formatMessage({ id: 'ui-rs.pullSlip.error' }, { errMsg })}
          </MessageBanner>
        )}
        {pdfUrl && <iframe src={pdfUrl} width="100%" height="100%" title={title} />}
      </Pane>
    </Paneset>
  );
};

export default PullSlipsRoute;
