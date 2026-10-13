import React from 'react';
import { Link, useLocation } from 'react-router';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

import { Box, Center, Heading, Text } from '/imports/ui/core';
import type { Site } from '/imports/ui/types';

import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import { publicUrl } from '/imports/api/_utils/shared';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';

export interface PageHeadingProps {
  site: Site;
  listing: string;
  // Something that floats to the right of the heading, such as a switch
  aside?: React.ReactNode;
  // A heading other than the section's name, e.g. the chosen kind
  title?: string;
  // What is listed, in the definite plural ("kulturevenemangen"), for the
  // "Visar … i <ort>" line; defaults to the section's own
  subject?: string;
}

// The heading of a listing page: the section's icon, name and description
// as the menu has them. The plus for creating content lives in the header.
export default function PageHeading({
  site,
  listing,
  aside,
  title,
  subject,
}: PageHeadingProps) {
  const currentLocation = useCurrentLocation();
  const routerLocation = useLocation();
  // The same listing for the whole municipality: drop the place prefix,
  // keep the kind and the past/upcoming choice.
  const wholeMunicipalityPath = currentLocation
    ? routerLocation.pathname.replace(`/${currentLocation.slug}`, '') +
      routerLocation.search
    : '/';
  const listingInMenu = site?.settings?.menu?.find(
    (item) => item.name === listing
  );
  const [tc] = useTranslation('common');
  const description = listingInMenu?.description;
  const heading = title || listingInMenu?.label;
  const url = publicUrl(`/${listingInMenu?.name}`);
  // What a link to this page shows elsewhere: the menu's description when
  // the admin wrote one, else the site's own line; the site's social image.
  const metaDescription = description || tc('home.hero.tagline');
  const imageUrl = publicUrl('/images/og-default.jpg');
  const icon = sectionIcons[listing];

  return (
    <>
      <Helmet>
        <title>{String(heading || 'Page')}</title>
        <link rel="canonical" href={url} />
        <meta charSet="utf-8" />
        <meta name="title" content={String(heading || 'Page')} />
        <meta name="description" content={String(metaDescription)} />
        <meta
          property="og:title"
          content={String(heading || 'Page')?.substring(0, 40)}
        />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={imageUrl} />
        <meta
          property="og:description"
          content={String(metaDescription)?.substring(0, 150)}
        />
        <meta property="og:type" content="website" />
      </Helmet>
      <Center>
        <Box px="2" w="100%">
          <div className="page-heading-row page-wrap">
            <div className="page-heading">
              {icon && (
                <ThreeDIcon
                  className="page-heading-icon"
                  name={icon}
                  size={56}
                />
              )}
              <Heading as="h1" size="lg" textAlign="center">
                {heading}
              </Heading>
            </div>
            {aside && <div className="page-heading-aside">{aside}</div>}
          </div>
          <Box py="2">
            {/* Inside a place, say so: the listing shows that place only */}
            {currentLocation && (
              <Center>
                {/* The whole line is the button to the whole municipality */}
                <Link
                  className="page-heading-place"
                  to={wholeMunicipalityPath}
                  title={tc('listing.wholeMunicipality')}
                >
                  <span>
                    {tc('listing.showingIn', {
                      what: subject || tc(`listing.subjects.${listing}`),
                      place: currentLocation.name,
                    })}
                  </span>
                  <span className="page-heading-clear" aria-hidden>
                    <XIcon width={14} height={14} />
                  </span>
                </Link>
              </Center>
            )}
            {description && (
              <Center>
                <Text
                  size="lg"
                  css={{
                    color: 'var(--cocoso-mylla-soft)',
                    fontWeight: '400',
                    lineHeight: '1.4',
                    maxWidth: '520px',
                    textAlign: 'center',
                  }}
                >
                  {description}
                </Text>
              </Center>
            )}
          </Box>
        </Box>
      </Center>
    </>
  );
}
