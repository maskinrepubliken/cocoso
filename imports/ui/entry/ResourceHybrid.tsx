import { Link } from 'react-router';
import React from 'react';
import { Trans } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

import { Box, Flex, Text } from '/imports/ui/core';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import type { Document, Site, ResourceForCombo } from '/imports/ui/types';

import TablyCentered from './TablyCentered';
import { publicUrl } from '/imports/api/_utils/shared';
import { useLocationName } from '/imports/ui/utils/useLocation';

interface Resource {
  _id: string;
  label?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  capacity?: number;
  isBookable?: boolean;
  isCombo?: boolean;
  resourcesForCombo?: ResourceForCombo[];
}

export interface ResourceHybridProps {
  documents?: Document[];
  resource: Resource;
  siteDoc: Site;
}

export default function ResourceHybrid({
  documents,
  resource,
  siteDoc,
}: ResourceHybridProps) {
  const locationName = useLocationName((resource as any)?.locationId);
  if (!resource) {
    return null;
  }

  const tabs = [
    {
      title: <Trans i18nKey="common:labels.info">Info</Trans>,
      content: (
        <Box
          className="text-content"
          p="6"
          css={{
            backgroundColor: 'var(--cocoso-papper)',
            borderRadius: 'var(--cocoso-radius-kort)',
            boxShadow: 'var(--cocoso-skugga)',
          }}
        >
          {resource?.description &&
            HTMLReactParser(DOMPurify.sanitize(resource?.description))}
        </Box>
      ),
      path: 'info',
    },
  ];

  if (resource.isCombo) {
    tabs.push({
      title: <Trans i18nKey="resources:labels.combo">Combo</Trans>,
      content: (
        <Flex direction="column" gap="2" pt="6">
          {resource.resourcesForCombo.map((res) => (
            <Link key={res._id} to={`/resources/${res._id}/info`}>
              <Box
                css={{
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                }}
                px="4"
                py="2"
              >
                <Text fontSize="lg">{res.label}</Text>
              </Box>
            </Link>
          ))}
        </Flex>
      ),
      path: 'combo',
    });
  }

  if (documents && documents[0]) {
    tabs.push({
      title: <Trans i18nKey="common:documents.label">Documents</Trans>,
      content: (
        <Box p="6">
          <DocumentsField contextType="works" contextId={resource?._id} />
        </Box>
      ),
      path: 'documents',
    });
  }

  // if (currentUser && canCreateContent && resource.isBookable) {
  //   tabs.push({
  //     title: t('booking.labels.field'),
  //     content: <BookingsField currentUser={currentUser} selectedResource={resource} />,
  //     path: 'bookings',
  //   });
  // }

  const tags: any[] = [];
  if (locationName) {
    tags.push(locationName);
  }
  if (resource.isCombo) {
    tags.push(<Trans i18nKey="resources:cards.isCombo">Combo</Trans>);
  }

  if (resource.isBookable) {
    tags.push(<Trans i18nKey="resources:cards.isBookable">Bookable</Trans>);
  }

  const resourcesInMenu = siteDoc?.settings?.menu?.find(
    (item) => item.name === 'resources'
  );
  const backLink = {
    value: '/resources',
    label: resourcesInMenu?.label,
  };

  const url = publicUrl(`/resources/${resource._id}`);

  return (
    <TablyCentered
      backLink={backLink}
      images={resource?.images}
      placeholderSeed={resource?._id}
      tabs={tabs}
      tags={tags}
      title={resource.label}
      url={url}
    />
  );
}
