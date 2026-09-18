import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';

import { Alert, Box, Button, Center } from '/imports/ui/core';
import NewHostForm from '/imports/ui/forms/NewHostForm';

import { Signup } from '../auth';
import Stepper from '../../generic/Stepper';
import { call } from '../../../api/_utils/shared';
import { message } from '../../generic/message';
import { loginWithPasswordAsync } from '../auth/functions';

export interface HostFormValues {
  host: string;
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

const steps = [
  {
    title: 'User',
    description: 'Admin account',
  },
  {
    title: 'Site',
    description: 'Name and contact details',
  },
];

const hostModel = {
  host: window.location.host,
  name: '',
  email: '',
  address: '',
  city: '',
  country: '',
  about: '',
};

export default function SetupHome() {
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
      const host = await call('getCurrentHost');
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
        message.error('User creation failed');
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
        error.error?.reason || error.reason || 'Error creating user'
      );
    }
  };

  const onCreateHost = async (data: HostFormValues) => {
    const parsedValues = {
      ...data,
      aboutTitle: `About ${data.name}`,
    };

    try {
      await call('createNewHost', parsedValues);
      const host = await call('getCurrentHost');
      setState((prevState) => ({
        ...prevState,
        host,
      }));
    } catch (error: any) {
      message.error(error.reason || error.error || 'Error creating host');
    }
  };

  const goHomeAndReload = () => {
    window.location.href = window.location.host;
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const renderBody = () => {
    if (state.currentStep === '2') {
      // finished
      return (
        <>
          <Alert type="success">
            You have successfully finished the installation
          </Alert>
          <Center>
            <Button my="4" variant="ghost" onClick={() => goHomeAndReload()}>
              Go to the home page
            </Button>
          </Center>
        </>
      );
    }

    if (state.currentStep === '1') {
      return <NewHostForm defaultValues={hostModel} onSubmit={onCreateHost} />;
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
