import { Link } from 'react-router';
import React from 'react';
import { Trans } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Box, Center, Flex, Heading, Text } from '/imports/ui/core';

import FeedbackForm from './FeedbackForm';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';
import ChangeLanguageMenu from './ChangeLanguageMenu';

export interface OldFooterProps {
  settings: any;
}

export function OldFooter({ settings }: OldFooterProps) {
  return (
    <Box
      p="4"
      css={{
        fontSize: '85%',
        lineHeight: '2',
        textAlign: 'center',
      }}
    >
      <Text color="gray.100" size="sm">
        {settings?.address}
        {', '} {settings?.city}
      </Text>
      <br />
      <Text color="gray.100" fontSize="sm">
        {settings?.email}
      </Text>
    </Box>
  );
}

export interface FooterProps {
  currentHost: any;
}

export function Footer({ currentHost }: FooterProps) {
  const prefix = useLocationPrefix();
  if (!currentHost || !currentHost.settings) {
    return null;
  }

  const { settings } = currentHost;
  const activeMenu = currentHost.settings?.menu?.filter(
    (item) => item.isVisible
  );

  return (
    <Box bg="gray.700" bottom={0} color="gray.100">
      <Center p="4">
        <Flex wrap="wrap" justify="center">
          {activeMenu.map((item) => (
            <Box key={item.name} p="2">
              <Link
                to={
                  item.name === 'info'
                    ? `${prefix}/info/about`
                    : item.isComposablePage
                    ? `${prefix}/cp/${item.name}`
                    : `${prefix}/${item.name}`
                }
              >
                <Text color="theme.50">{item.label}</Text>{' '}
              </Link>
            </Box>
          ))}
        </Flex>
      </Center>

      <Center pt="2">
          <Flex
            direction="column"
            justify="center"
            css={{
              textAlign: 'center',
            }}
          >
            <Center>
              <Heading size="md">{settings.name}</Heading>
            </Center>
            <Center>
              {settings.footer ? (
                <Box
                  className="text-content dark"
                  mt="4"
                  w="100%"
                  css={{
                    fontSize: '85%',
                    textAlign: 'center',
                    maxWidth: '480px',
                  }}
                >
                  {HTMLReactParser(DOMPurify.sanitize(settings.footer))}
                </Box>
              ) : (
                <OldFooter settings={settings} />
              )}
            </Center>
            <Center>
              <Link to="/terms-&-privacy-policy">
                <Text color="blue.100" fontSize="xs">
                  <Trans i18nKey="common:terms.title">
                    Terms of Service & Privacy Policy
                  </Trans>
                </Text>
              </Link>
            </Center>
            <FeedbackForm />
          </Flex>
        </Center>
      <Center p="4">
        <ChangeLanguageMenu centered />
      </Center>
    </Box>
  );
}
