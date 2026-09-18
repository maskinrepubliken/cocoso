import { Trans } from 'react-i18next';
import React from 'react';
import { getDefaultStore } from 'jotai';

import { call } from './api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import { siteAtom } from '/imports/state';

const defaultStore = getDefaultStore();

export async function updateSiteSettings({ values }) {
  try {
    await call('updateSiteSettings', values);
    const newHost = await call('getSite');
    defaultStore.set(siteAtom, newHost);
    message.success(<Trans i18nKey="common:message.success.update" />);
  } catch (error) {
    message.error(error.reason);
  }
}
