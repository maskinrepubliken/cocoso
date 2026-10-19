import { useAtomValue } from 'jotai';
import React from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

import { Box, Center, Heading } from '/imports/ui/core';
import ComposablePageHybrid from '/imports/ui/entry/ComposablePageHybrid';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import NewGridThumb from '/imports/ui/listing/NewGridThumb';
import GroupCard from '/imports/ui/listing/GroupCard';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import Stamp from '/imports/ui/generic/Stamp';
import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { locationsAtom } from '/imports/state';
import { worldForLocation } from '/imports/ui/utils/locationPalette';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { isMenuItemShown } from '/imports/api/_utils/features';
import { publicUrl } from '/imports/api/_utils/shared';

import type { SlugData } from './SlugHandler';

// A section of the place page: the section's 3D icon, its name with the
// place as a quieter suffix, and the way to the full listing kept on the
// same line at every width.
function Section({
  icon,
  title,
  place,
  seeAllTo,
  seeAllLabel,
  children,
}: {
  icon: string;
  title: string;
  place: string;
  seeAllTo: string;
  seeAllLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="page-wrap landing-section">
      <div className="landing-head">
        <ThreeDIcon className="landing-head-icon" name={icon} size={44} />
        <h2 className="landing-title">
          {title} <span className="landing-title-place">{place}</span>
        </h2>
        <Link className="landing-more" to={seeAllTo}>
          {seeAllLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
      {children}
    </section>
  );
}

export default function LocationLanding({ siteDoc }: { siteDoc: any }) {
  const slugData = useRouteLoaderData('slug') as SlugData | undefined;
  const { activities, composablePage, groups, resources } =
    (useLoaderData() as any) || {};
  const [tc] = useTranslation('common');
  const locations = useAtomValue(locationsAtom);

  const location = slugData?.location;
  if (!location) {
    return null;
  }

  const menu = siteDoc?.settings?.menu || [];
  const isVisible = (name: string) =>
    isMenuItemShown(menu.find((item: any) => item.name === name));
  const prefix = `/${location.slug}`;
  const heroImage = getImageUrl(location.images?.[0], 'full');
  const world = worldForLocation(locations, location._id);
  const title = `${location.name} | ${siteDoc?.settings?.name}`;
  const description = location.description
    ? DOMPurify.sanitize(location.description, { ALLOWED_TAGS: [] })
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : '';

  return (
    <Box>
      <Box
        className="location-hero"
        css={{
          backgroundColor: 'var(--cocoso-colors-theme-100)',
          backgroundImage: heroImage
            ? `url('${heroImage}')`
            : world
            ? `linear-gradient(135deg, ${world.from}, ${world.to})`
            : undefined,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          minHeight: heroImage ? '340px' : '260px',
          overflow: 'hidden',
          position: 'relative',
        }}
        mb="8"
      >
        {!heroImage && (
          <PlaceholderImage
            seed={location._id}
            style={{
              left: 0,
              mixBlendMode: 'multiply',
              opacity: 0.55,
              position: 'absolute',
              top: 0,
            }}
          />
        )}
        <Center
          css={{
            background: heroImage
              ? 'linear-gradient(to top, rgba(42,37,32,0.72), rgba(42,37,32,0.05))'
              : 'linear-gradient(to top, rgba(42,37,32,0.45), rgba(42,37,32,0))',
            flexDirection: 'column',
            gap: '0.9rem',
            minHeight: heroImage ? '340px' : '260px',
            padding: '2rem 1rem',
            position: 'relative',
          }}
        >
          <Stamp
            className="location-hero-stamp"
            name={location.name}
            size="lg"
            world={world}
          />
          <Heading
            as="h1"
            color="white"
            size="2xl"
            textAlign="center"
            css={{ textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}
          >
            {location.name}
          </Heading>
        </Center>
      </Box>

      {location.description && (
        <Center className="page-wrap landing-intro">
          <Box className="text-content" css={{ maxWidth: '680px' }}>
            {HTMLReactParser(DOMPurify.sanitize(location.description))}
          </Box>
        </Center>
      )}

      {composablePage?.isPublished && (
        <Box className="landing-section">
          <ComposablePageHybrid
            siteDoc={siteDoc}
            composablePage={{
              ...composablePage,
              settings: { ...composablePage.settings, hideTitle: true },
            }}
          />
        </Box>
      )}

      {isVisible('activities') && (
        <Section
          icon={sectionIcons.activities}
          title={tc('locations.landing.activities')}
          place={tc('locations.landing.inPlace', { name: location.name })}
          seeAllTo={`${prefix}/activities`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          {activities?.length ? (
            <div className="card-grid card-grid-wide">
              {activities.map((activity: any, index: number) => (
                <Link key={activity._id} to={`${prefix}/activities/${activity._id}`}>
                  <SexyThumb activity={activity} index={index} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="landing-empty">{tc('locations.landing.nothingYet')}</p>
          )}
        </Section>
      )}

      {isVisible('resources') && (
        <Section
          icon={sectionIcons.resources}
          title={tc('locations.landing.resources')}
          place={tc('locations.landing.inPlace', { name: location.name })}
          seeAllTo={`${prefix}/resources`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          {resources?.length ? (
            <div className="card-grid">
              {resources.map((resource: any, index: number) => (
                <Link key={resource._id} to={`${prefix}/resources/${resource._id}`}>
                  <NewGridThumb
                    fixedImageHeight
                    imageUrl={
                      getImageUrl(resource.images?.[0], 'small') || undefined
                    }
                    index={index}
                    placeholderSeed={resource._id}
                    title={resource.label}
                    world={world}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className="landing-empty">{tc('locations.landing.nothingYet')}</p>
          )}
        </Section>
      )}

      {isVisible('groups') && groups?.length > 0 && (
        <Section
          icon={sectionIcons.groups}
          title={tc('locations.landing.groups')}
          place={tc('locations.landing.inPlace', { name: location.name })}
          seeAllTo={`${prefix}/groups`}
          seeAllLabel={tc('locations.landing.seeAll')}
        >
          <div className="card-grid">
            {groups.map((group: any, index: number) => (
              <Link key={group._id} to={`${prefix}/groups/${group._id}`}>
                <GroupCard group={group} index={index} />
              </Link>
            ))}
          </div>
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
