import React from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

import { Box, Center, Heading } from '/imports/ui/core';

import NiceSlider from '../generic/NiceSlider';
import { parseTitle } from '/imports/api/_utils/shared';
import ShareMeta from '/imports/ui/layout/ShareMeta';

interface SimplePageProps {
  description?: string;
  images?: string[];
  imageUrl?: string;
  title?: string;
  path: string;
  actions?: React.ReactNode;
}

function SimplePage({
  description,
  images,
  imageUrl,
  title,
  path,
  actions,
}: SimplePageProps) {
  return (
    <>
      <ShareMeta
        title={title}
        description={description}
        path={path}
        image={images?.[0] || imageUrl}
        type="article"
      />

      <Center>
        <Heading
          as="h1"
          css={{ margin: '1rem 0.5rem 0' }}
          size="lg"
          textAlign="center"
        >
          {title}
        </Heading>
      </Center>

      {images && (
        <Center pt="4" pb="2" mb="0">
          <NiceSlider alt={title} images={images} />
        </Center>
      )}

      {description && (
        <Center>
          <Box
            className="text-content"
            mt="2"
            mb={actions ? '8' : '24'}
            p="6"
            css={{
              backgroundColor: 'var(--cocoso-papper)',
              borderRadius: 'var(--cocoso-radius-kort)',
              boxShadow: 'var(--cocoso-skugga)',
              maxWidth: '620px',
              width: '100%',
            }}
          >
            {description && HTMLReactParser(DOMPurify.sanitize(description))}
          </Box>
        </Center>
      )}

      {actions && (
        <Center>
          <Box mb="24" css={{ maxWidth: '620px', width: '100%' }}>
            {actions}
          </Box>
        </Center>
      )}
    </>
  );
}

interface Page {
  _id: string;
  title?: string;
  longDescription?: string;
  imageUrl?: string;
  images?: string[];
}

export interface PageHybridProps {
  currentPage: Page;
  actions?: React.ReactNode;
}

export default function PageHybrid({
  currentPage,
  actions,
}: PageHybridProps) {
  if (!currentPage) {
    return null;
  }

  return (
    <SimplePage
      description={currentPage.longDescription}
      images={currentPage.images}
      title={currentPage.title}
      path={`/info/${parseTitle(currentPage.title)}`}
      imageUrl={currentPage.imageUrl}
      actions={actions}
    />
  );
}
