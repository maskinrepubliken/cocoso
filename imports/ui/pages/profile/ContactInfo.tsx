import React, { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useAtomValue } from 'jotai';

import {
  Box,
  Button,
  Center,
  Loader,
  Modal,
  Text,
} from '/imports/ui/core';

import { isDesktopAtom } from '../../../state';
import { call } from '../../../api/_utils/shared';
import { message } from '../../generic/message';

export default function ContactInfo({
  username,
  value,
}: {
  username: string;
  value?: string;
}) {
  const isDesktop = useAtomValue(isDesktopAtom);
  const [modalOpen, setModalOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const getContactInfo = async () => {
    try {
      const response = await call('getUserContactInfo', username);
      setContactInfo(response);
      setLoaded(true);
    } catch (error) {
      message.error(error.reason || error.error);
    }
  };

  useEffect(() => {
    if (!username) {
      return;
    }
    if (!value) {
      getContactInfo();
    } else {
      setContactInfo(value);
      setLoaded(true);
    }
  }, []);

  if (!username) {
    return null;
  }

  return (
    <>
      <Center>
        <Button
          size={isDesktop ? 'lg' : 'md'}
          onClick={() => setModalOpen(true)}
        >
          <Trans i18nKey="common:labels.contact">Contact</Trans>
        </Button>
      </Center>

      <Modal
        id="contact-info"
        open={modalOpen}
        title={
          <>
            <Trans i18nKey="common:labels.contact">Contact</Trans>
            {`: ${username}`}
          </>
        }
        hideFooter
        onCancel={() => setModalOpen(false)}
        onClose={() => setModalOpen(false)}
      >
        {contactInfo ? (
          <Box
            bg="white"
            className="text-content"
            p="4"
            css={{ textAlign: 'center' }}
          >
            {HTMLReactParser(DOMPurify.sanitize(contactInfo))}
          </Box>
        ) : loaded ? (
          <Text
            css={{ color: 'var(--cocoso-mylla-soft)', padding: '1rem', textAlign: 'center' }}
          >
            <Trans i18nKey="common:labels.noContactInfo">
              No contact details given.
            </Trans>
          </Text>
        ) : (
          <Loader />
        )}

      </Modal>
    </>
  );
}
