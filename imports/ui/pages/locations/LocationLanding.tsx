import React from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

import { Box, Button, Center, Flex, Heading, Text } from '/imports/ui/core';
import ComposablePageHybrid from '/imports/ui/entry/ComposablePageHybrid';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import NewGridThumb from '/imports/ui/listing/NewGridThumb';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { publicUrl } from '/imports/api/_utils/shared';

import type { SlugData } from './SlugHandler';

function Section({
  title,
  seeAllTo,
  seeAllLabel,
  children,
}: {
  title: string;
  seeAllTo: string;
  seeAllLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Box mb="10" px="4">
      <Flex align="center" justify="space-between" mb="3" wrap="wrap">
        <Heading size="md">{title}</Heading>
        <Link to={seeAllTo}>
          <Button size="sm" variant="ghost">
            {seeAllLabel}
          </Button>
        </Link>
      </Flex>
      {children}
    </Box>
  );
}

export default function LocationLanding({ Host }: { Host: any }) {
  const slugData = useRouteLoaderData('slug') as SlugData | undefined;
  const { activities, composablePage, groups, resources } =
    (useLoaderData() as any) || {};
  const [tc] = useTranslation('common');

  const location = slugData?.location;
  if (!location) {
    return null;
  }

  const menu = Host?.settings?.menu || [];
  const isVisible = (name: string) =>
    menu.find((item: any) => item.name === name)?.isVisible;
  const prefix = `/${location.slug}`;
  const heroImage = getImageUrl(location.images?.[0], 'full');
  const title = `${location.name} | ${Host?.settings?.name}`;
  const description = location.description
    ? DOMPurify.sanitize(location.description, { ALLOWED_TAGS: [] })
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : '';

  return (
    <Box>
      <Box
        css={{
          backgroundColor: 'var(--cocoso-colors-theme-100)',
          backgroundImage: heroImage ? `url('${heroImage}')` : undefined,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          minHeight: heroImage ? '320px' : undefined,
          position: 'relative',
        }}
        mb="6"
      >
        <Center
          css={{
            background: heroImage
              ? 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.05))'
              : undefined,
            minHeight: heroImage ? '320px' : undefined,
            padding: '2rem 1rem',
          }}
        >
          <Heading
            color={heroImage ? 'white' : undefined}
            size="xl"
            textAlign="center"
            css={{ textShadow: heroImage ? '0 1px 3px rgba(0,0,0,0.7)' : 'none' }}
          >
            {location.name}
          </Heading>
        </Center>
      </Box>

      {location.description && (
        <Center mb="8" px="4">
          <Box className="text-content" css={{ maxWidth: '680px' }}>
            {HTMLReactParser(DOMPurify.sanitize(location.description))}
          </Box>
        </Center>
      )}

      {composablePage?.isPublished && (
        <Box mb="8">
          <ComposablePageHybrid
            Host={Host}
            composablePage={{
              ...composablePage,
              settings: { ...composablePage.settings, hideTitle: true },
            }}
          />
        </Box>
      )}

      {isVisible('activities') && (
        <Section
          title={tc('locations.landing.activities', { name: location.name })}
          seeAllTo={`${prefix}/activities`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          {activities?.length ? (
            <Flex gap="4" justify="center" wrap="wrap">
              {activities.map((activity: any, index: number) => (
                <Link key={activity._id} to={`${prefix}/activities/${activity._id}`}>
                  <SexyThumb activity={activity} index={index} />
                </Link>
              ))}
            </Flex>
          ) : (
            <Text color="gray.600">{tc('locations.landing.nothingYet')}</Text>
          )}
        </Section>
      )}

      {isVisible('resources') && (
        <Section
          title={tc('locations.landing.resources', { name: location.name })}
          seeAllTo={`${prefix}/resources`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          {resources?.length ? (
            <Flex gap="4" justify="center" wrap="wrap">
              {resources.map((resource: any, index: number) => (
                <Box key={resource._id} css={{ width: '260px' }}>
                  <Link to={`${prefix}/resources/${resource._id}`}>
                    <NewGridThumb
                      fixedImageHeight
                      imageUrl={
                        getImageUrl(resource.images?.[0], 'small') || undefined
                      }
                      index={index}
                      title={resource.label}
                    />
                  </Link>
                </Box>
              ))}
            </Flex>
          ) : (
            <Text color="gray.600">{tc('locations.landing.nothingYet')}</Text>
          )}
        </Section>
      )}

      {isVisible('groups') && groups?.length > 0 && (
        <Section
          title={tc('locations.landing.groups', { name: location.name })}
          seeAllTo={`${prefix}/groups`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          <Flex gap="4" justify="center" wrap="wrap">
            {groups.map((group: any, index: number) => (
              <Link key={group._id} to={`${prefix}/groups/${group._id}`}>
                <SexyThumb activity={group} index={index} />
              </Link>
            ))}
          </Flex>
        </Section>
      )}

      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={publicUrl(prefix)} />
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta property="og:title" content={title.substring(0, 60)} />
        <meta property="og:url" content={publicUrl(prefix)} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>
    </Box>
  );
}
