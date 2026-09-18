import { Trans } from 'react-i18next';
import React from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

import { Box, Text } from '/imports/ui/core';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import type { Document, Site } from '/imports/ui/types';

import TablyCentered from './TablyCentered';
import { publicUrl } from '/imports/api/_utils/shared';
import { useLocationName } from '/imports/ui/utils/useLocation';

interface Work {
  _id: string;
  title?: string;
  authorUsername?: string;
  authorAvatar?: string;
  shortDescription?: string;
  longDescription?: string;
  additionalInfo?: string;
  contactInfo?: string;
  imageUrl?: string;
  images?: string[];
  showAvatar?: boolean;
  category?: {
    label?: string;
  };
}

export interface WorkHybridProps {
  documents?: Document[];
  work: Work;
  siteDoc: Site;
}

export default function WorkHybrid({ documents, work, siteDoc }: WorkHybridProps) {
  const locationName = useLocationName((work as any)?.locationId);
  if (!work) {
    return null;
  }

  const tabs = [
    {
      title: <Trans i18nKey="common:labels.info">Info</Trans>,
      content: (
        <Box bg="white" className="text-content" p="6">
          {work?.longDescription &&
            HTMLReactParser(DOMPurify.sanitize(work?.longDescription))}
        </Box>
      ),
      path: 'info',
    },
  ];

  if (work.additionalInfo?.length > 2) {
    tabs.push({
      title: <Trans i18nKey="common:labels.extra">Extra</Trans>,
      content: (
        <Box bg="white" p="6">
          <Text textAlign="center">{work?.additionalInfo}</Text>
        </Box>
      ),
      path: 'extra',
    });
  }

  if (documents && documents[0]) {
    tabs.push({
      title: <Trans i18nKey="common:documents.label">Documents</Trans>,
      content: (
        <Box p="6">
          <DocumentsField contextType="works" contextId={work?._id} />
        </Box>
      ),
      path: 'documents',
    });
  }

  const tags =
    work && ([work.category?.label, locationName].filter(Boolean) as string[]);
  const worksInMenu = siteDoc?.settings?.menu.find(
    (item) => item.name === 'works'
  );

  const url = publicUrl(`/@${work.authorUsername}/works/${work._id}`);

  return (
    <TablyCentered
      author={
        work.showAvatar && {
          src: work.authorAvatar,
          username: work.authorUsername,
        }
      }
      backLink={{ value: '/works', label: worksInMenu.label }}
      images={work?.images || [work.imageUrl]}
      subTitle={work.shortDescription}
      tabs={tabs}
      tags={tags}
      title={work.title}
      url={url}
    />
  );
}
