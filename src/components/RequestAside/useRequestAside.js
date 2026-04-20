import React, { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';

const PARAM = 'aside';

const useRequestAside = (slots) => {
  const history = useHistory();
  const location = useLocation();
  const query = queryString.parse(location.search);
  const openSlot = query[PARAM] && slots[query[PARAM]] ? query[PARAM] : undefined;

  const setSlot = useCallback((next) => {
    const nextQuery = { ...query };
    if (next) nextQuery[PARAM] = next;
    else delete nextQuery[PARAM];
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify(nextQuery),
    });
  }, [history, location.pathname, query]);

  const toggle = useCallback((slot) => {
    setSlot(slot === openSlot ? undefined : slot);
  }, [openSlot, setSlot]);

  const isOpen = useCallback((slot) => openSlot === slot, [openSlot]);

  const AsidePane = useCallback((props) => {
    if (!openSlot) return null;
    const Component = slots[openSlot];
    if (!Component) return null;
    return <Component onToggle={() => setSlot(undefined)} {...props} />;
  }, [openSlot, slots, setSlot]);

  return { AsidePane, toggle, isOpen, openSlot };
};

export default useRequestAside;
