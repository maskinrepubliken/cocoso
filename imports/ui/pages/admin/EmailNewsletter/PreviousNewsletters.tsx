import { Link, Outlet, useLoaderData } from 'react-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Box,
  Center,
  Divider,
  Flex,
  Heading,
  Link as CLink,
  Text,
} from '/imports/ui/core';
import NiceList from '/imports/ui/generic/NiceList';

export default function PreviousNewsletters() {
  const { newsletters } = useLoaderData();
  const [tc] = useTranslation('common');

  return (
    <Center>
      <Box pb="4" maxW="800px">
        <Center>
          <Heading size="lg" css={{ marginBottom: '16px' }} textAlign="center">
            {tc('labels.newsletters')}
          </Heading>
        </Center>

        {(!newsletters || newsletters.length === 0) && (
          <Text
            textAlign="center"
            css={{ color: 'var(--cocoso-mylla-soft)', padding: '1rem' }}
          >
            {tc('labels.noNewsletters')}
          </Text>
        )}

        {newsletters?.length > 0 && (
          <NiceList
            actionsDisabled
            list={newsletters}
            keySelector="_id"
            spacing="0"
            bg="white"
            p="8"
          >
            {(email) => {
              return (
                <Box>
                  <Flex alignItems="flex-start" mb="4">
                    <Box>
                      <Link to={`/newsletters/${email._id}`}>
                        <CLink>
                          <Heading size="md">{email.subject}</Heading>
                        </CLink>
                      </Link>
                      <Box mb="1" mt="2">
                        <Text>{tc('labels.author')}: </Text>
                        <Text fontWeight="bold">{email.authorUsername}</Text>
                      </Box>
                      <Text color="gray.600" fontSize="sm">
                        {email.creationDate.toString()}
                      </Text>
                    </Box>
                  </Flex>
                  <Divider />
                </Box>
              );
            }}
          </NiceList>
        )}
      </Box>

      <Outlet />
    </Center>
  );
}
