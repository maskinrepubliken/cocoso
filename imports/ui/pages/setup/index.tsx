import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, Button, Center } from '/imports/ui/core';
import SiteForm from '/imports/ui/forms/SiteForm';

import { Signup } from '../auth';
import Stepper from '../../generic/Stepper';
import { call } from '../../../api/_utils/shared';
import { message } from '../../generic/message';
import { loginWithPasswordAsync } from '../auth/functions';

export interface SiteFormValues {
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
  about: string;
  aboutTitle?: string;
}

interface SignupFormValues {
  username: string;
  email: string;
  password: string;
}

const siteModel = {
  name: '',
  email: '',
  address: '',
  city: '',
  country: '',
  about: '',
};

export default function SetupHome() {
  const [t] = useTranslation('accounts');

  const steps = [
    {
      title: t('setup.steps.user.title'),
      description: t('setup.steps.user.description'),
    },
    {
      title: t('setup.steps.site.title'),
      description: t('setup.steps.site.description'),
    },
  ];

  const [state, setState] = useState<{
    currentStep: string;
    user: any;
    host: any;
  }>({
    currentStep: '0',
    user: null,
    host: null,
  });

  const getData = async () => {
    if (!state.user) {
      const user = await Meteor.userAsync();
      setState((prevState) => ({
        ...prevState,
        user,
      }));
    }
    if (!state.host) {
      const host = await call('getSite');
      setState((prevState) => ({
        ...prevState,
        host,
      }));
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    getData();
    window.scrollTo(0, 0);
    let currentStep = '0';
    if (!state.user) {
      return;
    } else if (!state.host) {
      currentStep = '1';
    } else {
      currentStep = '2';
    }
    setState((prevState) => ({
      ...prevState,
      currentStep,
    }));
  }, [state.user, state.host]);

  const onCreateUser = async (data: SignupFormValues) => {
    try {
      const userId = await call('createAccount', data);
      if (!userId) {
        message.error(t('setup.errors.user'));
        return;
      }
      await loginWithPasswordAsync(data.username, data.password);
      const user = await Meteor.userAsync();
      setState((prevState) => ({
        ...prevState,
        user,
      }));
    } catch (error: any) {
      message.error(
        error.error?.reason || error.reason || t('setup.errors.user')
      );
    }
  };

  const onCreateHost = async (data: SiteFormValues) => {
    const parsedValues = {
      ...data,
      aboutTitle: t('setup.aboutTitle', { name: data.name }),
    };

    try {
      await call('createSite', parsedValues);
      const host = await call('getSite');
      setState((prevState) => ({
        ...prevState,
        host,
      }));
    } catch (error: any) {
      message.error(error.reason || error.error || t('setup.errors.site'));
    }
  };

  const goHomeAndReload = () => {
    window.location.href = '/';
  };

  const renderBody = () => {
    if (state.currentStep === '2') {
      // finished
      return (
        <>
          <Alert type="success">{t('setup.success')}</Alert>
          <Center>
            <Button my="4" variant="ghost" onClick={() => goHomeAndReload()}>
              {t('setup.goHome')}
            </Button>
          </Center>
        </>
      );
    }

    if (state.currentStep === '1') {
      return <SiteForm defaultValues={siteModel} onSubmit={onCreateHost} />;
    }
    if (state.currentStep === '0') {
      return <Signup hideTermsCheck onSubmit={onCreateUser} />;
    }
  };

  return (
    <Box bg="gray.100" pb="4" css={{ minHeight: '100vh' }}>
      <Center px="4" py="8">
        <Stepper steps={steps} activeStep={Number(state.currentStep)} />
      </Center>
      <Center>
        <Box bg="gray.50" px="8" py="4" w="100%" css={{ maxWidth: '420px' }}>
          {renderBody()}
        </Box>
      </Center>
    </Box>
  );
}
