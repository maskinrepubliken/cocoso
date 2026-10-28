import React from 'react';
import { Link, useLocation } from 'react-router';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useTranslation } from 'react-i18next';

import { Box, Center, Heading, Text } from '/imports/ui/core';
import type { Site } from '/imports/ui/types';

import ThreeDIcon, { sectionIcons } from '/imports/ui/generic/ThreeDIcon';
import ShareMeta from '/imports/ui/layout/ShareMeta';
import { useCurrentLocation } from '/imports/ui/utils/useLocation';
import sectionDescription from '/imports/ui/utils/sectionDescription';

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
  // Leave out the line under the heading (the events page has its kinds
  // there instead)
  hideDescription?: boolean;
  // Leave out the "Visar bara … i <ort>" line; the page renders a
  // PlaceNotice itself further down
  hidePlace?: boolean;
}

export interface PlaceNoticeProps {
  listing: string;
  subject?: string;
}

// Inside a place, say so: the listing shows that place only. The whole
// line is the button to the same listing for the whole municipality.
export function PlaceNotice({ listing, subject }: PlaceNoticeProps) {
  const currentLocation = useCurrentLocation();
  const routerLocation = useLocation();
  const [tc] = useTranslation('common');
  if (!currentLocation) {
    return null;
  }
  // Drop the place prefix, keep the kind and the past/upcoming choice.
  const wholeMunicipalityPath =
    routerLocation.pathname.replace(`/${currentLocation.slug}`, '') +
    routerLocation.search;
  return (
    <Center>
      <Link
        className="page-heading-place"
        to={wholeMunicipalityPath}
        title={tc('listing.wholeMunicipality')}
      >
        <span>
          {tc('listing.showingIn', {
            what: subject || tc(`listing.subjects.${listing}`),
            prep: tc(`listing.prep.${listing}`, {
              defaultValue: tc('listing.prep.default'),
            }),
            place: currentLocation.name,
          })}
        </span>
        <span className="page-heading-clear" aria-hidden>
          <XIcon width={14} height={14} />
        </span>
      </Link>
    </Center>
  );
}

// The heading of a listing page: the section's icon, name and description
// as the menu has them. The plus for creating content lives in the header.
export default function PageHeading({
  site,
  listing,
  aside,
  title,
  subject,
  hideDescription = false,
  hidePlace = false,
}: PageHeadingProps) {
  const listingInMenu = site?.settings?.menu?.find(
    (item) => item.name === listing
  );
  const [tc] = useTranslation('common');
  const { pathname } = useLocation();
  const description = hideDescription
    ? ''
    : sectionDescription(listingInMenu, tc);
  const heading = title || listingInMenu?.label;
  // What a link to this page shows elsewhere: the menu's description when
  // the admin wrote one, else the site's own line; the site's social image.
  const metaDescription = description || tc('home.hero.tagline');
  const icon = sectionIcons[listing];

  return (
    <>
      <ShareMeta
        title={heading ? String(heading) : undefined}
        description={metaDescription}
        path={pathname}
      />
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
            {!hidePlace && <PlaceNotice listing={listing} subject={subject} />}
          </Box>
        </Box>
      </Center>
    </>
  );
}
