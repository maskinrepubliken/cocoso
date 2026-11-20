import React, { useEffect } from 'react';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Address } from '/imports/api/_utils/address';
import { useAtomValue } from 'jotai';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar-days';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import {
  LightboxProvider,
  LightboxTrigger,
} from '/imports/ui/generic/Lightbox';

import { styled } from '/stitches.config';
import { Tag } from '/imports/ui/core';
import Notice from '/imports/ui/generic/Notice';
import type { Site } from '/imports/ui/types';
import { kindsOf } from '/imports/api/_utils/kinds';
import { publicUrl } from '/imports/api/_utils/shared';
import { activityShareImageUrl } from '/imports/api/share/shareImage';
import { eventStructuredData } from '/imports/ui/utils/structuredData';
import ShareMeta, { shareText } from '/imports/ui/layout/ShareMeta';
import { currentUserAtom, roleAtom } from '/imports/state';
import { useLocationTag } from '/imports/ui/utils/useLocation';
import { colorsForKind } from '/imports/ui/utils/kindPalette';

import PlaceholderImage from '../generic/PlaceholderImage';
import { getImageUrl } from '../utils/imageHelper';

import Section, { NARROW, WIDE } from '../pages/activities/event/Section';
import WhenSection from '../pages/activities/event/WhenSection';
import PlaceSection from '../pages/activities/event/PlaceSection';
import LocationTag from '/imports/ui/generic/LocationTag';
import OrganizerSection, {
  OrganizerProfile,
  PublicContact,
} from '../pages/activities/event/OrganizerSection';
import AttendeesSection from '../pages/activities/event/AttendeesSection';
import RegistrationSection from '../pages/activities/event/RegistrationSection';
import OrganizerToolsSection from '../pages/activities/event/OrganizerToolsSection';
import FollowSection from '../pages/activities/event/FollowSection';
import {
  Occurrence,
  formatOccurrence,
  isPastOccurrence,
  pickOccurrenceIndex,
} from '../pages/activities/event/occurrences';
import { sitePath } from '/imports/api/_utils/paths';

const Page = styled('div', {
  margin: '0 auto',
  maxWidth: '1080px',
  padding: '0 1rem 3rem',
  width: '100%',
});

// The top of the page: the picture on the left and, beside it, what the
// event is, when and where. The description follows in its own section.
const Hero = styled('header', {
  display: 'grid',
  gap: '1rem',
  marginBottom: '1.5rem',
  [WIDE]: {
    alignItems: 'center',
    gap: '2.25rem',
    gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 6fr)',
  },
  variants: {
    noImage: { true: { [WIDE]: { gridTemplateColumns: 'minmax(0, 1fr)' } } },
  },
});

const ImageBox = styled('div', {
  aspectRatio: '4 / 3',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga-kort)',
  overflow: 'hidden',
  width: '100%',
  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  // On a phone the picture runs edge to edge, past the page's own padding
  [NARROW]: {
    aspectRatio: '16 / 9',
    borderRadius: 0,
    boxShadow: 'none',
    margin: '0 -1rem',
    width: 'auto',
  },
});

const HeroText = styled('div', { minWidth: 0 });

const Title = styled('h1', {
  color: 'var(--cocoso-colors-theme-800)',
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '2rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  lineHeight: 1.08,
  margin: '0 0 0.5rem',
  textWrap: 'balance',
  [WIDE]: { fontSize: '2.75rem' },
});

const SubTitle = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '1.15rem',
  lineHeight: 1.4,
  margin: 0,
});

// When and where, right under the title
const Facts = styled('ul', {
  borderTop: '1px solid var(--cocoso-colors-theme-200)',
  display: 'grid',
  gap: '0.625rem',
  listStyle: 'none',
  margin: '1.1rem 0 0',
  padding: '1.1rem 0 0',
});

const Fact = styled('li', {
  alignItems: 'start',
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  '& > svg': {
    color: 'var(--cocoso-tegel)',
    height: '1.25rem',
    marginTop: '0.1rem',
    width: '1.25rem',
  },
});

const FactText = styled('p', {
  color: 'var(--cocoso-colors-theme-800)',
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontSize: '1.2rem',
  fontWeight: 600,
  lineHeight: 1.25,
  margin: 0,
  '&::first-letter': { textTransform: 'uppercase' },
  '& a': { color: 'inherit', textDecoration: 'none' },
  '& a:hover': { textDecoration: 'underline' },
});

const FactNote = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.9rem',
  margin: '0.15rem 0 0',
});

// The kind of event, in the kind's own colour as in the calendar
const KindTag = styled('span', {
  alignItems: 'center',
  borderRadius: '999px',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '12px',
  fontWeight: 600,
  height: '26px',
  lineHeight: 1,
  padding: '0 10px',
});

// Called off: lingon, above the description, with the organizer's words
const Cancelled = styled('div', {
  background: 'var(--cocoso-lingon-100)',
  borderLeft: '4px solid var(--cocoso-lingon)',
  borderRadius: '0.5rem',
  color: 'var(--cocoso-lingon)',
  margin: '1rem 0',
  padding: '0.75rem 1rem',
  '& strong': { display: 'block', fontSize: '1.125rem' },
  '& p': { margin: '0.25rem 0 0', whiteSpace: 'pre-line' },
});

const Tags = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  marginBottom: '0.75rem',
});

// On wide screens: the text and sign-up on the left, the facts on the right.
// On narrow screens both columns dissolve into one list ordered by each
// section's `order`.
const Layout = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  [WIDE]: {
    alignItems: 'start',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
  },
});

const Column = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  [NARROW]: { display: 'contents' },
  variants: {
    side: {
      true: { [WIDE]: { position: 'sticky', top: '1rem' } },
    },
  },
});

const Description = styled('div', {
  color: 'var(--cocoso-mylla)',
  fontSize: '1.02rem',
  lineHeight: 1.6,
  maxWidth: '66ch',
  '& p:first-child': { marginTop: 0 },
  '& p:last-child': { marginBottom: 0 },
});

interface Activity {
  _id: string;
  authorId?: string;
  authorName: string;
  title?: string;
  subTitle?: string;
  longDescription?: string;
  imageUrl?: string;
  images?: string[];
  isPublicActivity?: boolean;
  isArchived?: boolean;
  mirror?: { sourceUrl?: string; isDetached?: boolean };
  cancelledAt?: Date;
  cancelMessage?: string;
  isRegistrationDisabled?: boolean;
  isRegistrationEnabled?: boolean;
  capacity?: number;
  place?: string;
  resource?: string;
  resourceId?: string;
  address?: Partial<Address> | null;
  // The address to show: the place's, or the event's own (activity.place.js).
  placeAddress?: Partial<Address> | null;
  locationId?: string;
  isMunicipalityOnly?: boolean;
  datesAndTimes?: Occurrence[];
  organizers?: { userId: string; username: string }[];
  contact?: PublicContact | null;
  contactUserId?: string | null;
  organizerProfiles?: OrganizerProfile[];
  kinds?: string[] | null;
  category?: { key?: string } | null;
  creationDate?: Date | string;
  latestUpdate?: Date | string;
}

export interface ActivityHybridProps {
  activity: Activity;
  siteDoc: Site;
}

// The event page: everything about one event in sections — when, where,
// who organizes it, what it is, signing up and who is coming — plus tools
// for the organizer.
export default function ActivityHybrid({ activity }: ActivityHybridProps) {
  const [tc] = useTranslation('common');
  const locationName = useLocationTag(activity as any);
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);

  // The author, any co-organizer and the admins manage the event.
  const isOrganizer = Boolean(
    activity &&
      currentUser &&
      (role === 'admin' ||
        activity.authorId === currentUser._id ||
        activity.organizers?.some((o) => o.userId === currentUser._id))
  );

  // The server renders the page for an anonymous visitor, without the
  // attendees' emails; fetch again once the organizer is known.
  useEffect(() => {
    if (isOrganizer) {
      revalidator.revalidate();
    }
  }, [isOrganizer, activity?._id]);

  if (!activity) {
    return null;
  }

  const dates = activity.datesAndTimes || [];
  const selectedIndex = pickOccurrenceIndex(
    dates,
    searchParams.get('date'),
    searchParams.get('time')
  );
  const occurrence = dates[selectedIndex] || null;

  const selectDate = (index: number) => {
    const d = dates[index];
    if (!d) return;
    setSearchParams(
      (params) => {
        params.set('date', d.startDate);
        params.set('time', d.startTime);
        return params;
      },
      { preventScrollReset: true, replace: true }
    );
  };

  const { isPublicActivity } = activity;

  const images = (activity.images || [activity.imageUrl]).filter(
    (img): img is string => Boolean(img)
  );
  // A shared link shows the generated picture with the title, place and
  // date while the event has dates left, then its own photo.
  const shareImage = activityShareImageUrl(activity);
  const path = sitePath(
    isPublicActivity ? 'activities' : 'calendar',
    activity._id
  );
  const kinds = kindsOf(activity);
  const kindLabels = kinds.map((key) => tc(`eventKinds.${key}`));
  const author =
    activity.organizerProfiles?.find((p) => p.userId === activity.authorId) ||
    activity.organizerProfiles?.[0];
  const organizer = author
    ? {
        name:
          [author.firstName, author.lastName].filter(Boolean).join(' ') ||
          author.username,
        url: publicUrl(`/@${author.username}`),
      }
    : null;
  // What a shared link says: the event's own words, or, when it has none,
  // what kind of event it is, when and where.
  const venue = activity.resource || activity.place;
  const description =
    shareText(activity.subTitle || activity.longDescription) ||
    [
      kindLabels.join(', '),
      occurrence && formatOccurrence(occurrence),
      [venue, venue !== locationName && locationName]
        .filter(Boolean)
        .join(', '),
    ]
      .filter(Boolean)
      .join(' · ');
  const pictures = [
    shareImage,
    ...images.map((image) => getImageUrl(image, 'full')),
  ].filter((image): image is string => Boolean(image));

  return (
    <Page>
      <ShareMeta
        title={activity.title}
        description={description}
        path={path}
        image={shareImage || images[0]}
        generatedImage={Boolean(shareImage)}
        type="article"
        article={{
          publishedTime: activity.creationDate,
          modifiedTime: activity.latestUpdate || activity.creationDate,
          section: kindLabels[0] || locationName,
          tags: [...kindLabels, locationName].filter((tag): tag is string =>
            Boolean(tag)
          ),
          authors: organizer ? [organizer.url] : [],
        }}
        structuredData={
          isPublicActivity
            ? eventStructuredData({
                title: activity.title,
                description:
                  shareText(
                    activity.subTitle || activity.longDescription,
                    300
                  ) || description,
                url: publicUrl(path),
                images: pictures,
                datesAndTimes: dates,
                venue,
                locationName,
                address: activity.placeAddress || activity.address,
                organizer,
                isCancelled: Boolean(activity.cancelledAt),
              })
            : null
        }
      />

      <Hero noImage={!isPublicActivity}>
        {isPublicActivity && (
          <ImageBox>
            {images.length > 0 ? (
              <LightboxProvider alt={activity.title} images={images}>
                <LightboxTrigger showCount src={images[0]}>
                  <img
                    alt={activity.title}
                    src={getImageUrl(images[0], 'medium') || images[0]}
                  />
                </LightboxTrigger>
              </LightboxProvider>
            ) : (
              <PlaceholderImage
                seed={activity._id}
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </ImageBox>
        )}
        <HeroText>
          {(kinds.length > 0 ||
            locationName ||
            activity.isArchived ||
            activity.cancelledAt) && (
            <Tags>
              {kinds.map((kind) => (
                <KindTag
                  key={kind}
                  css={{
                    backgroundColor: colorsForKind(kind).tint,
                    color: colorsForKind(kind).ink,
                  }}
                >
                  {tc(`eventKinds.${kind}`)}
                </KindTag>
              ))}
              <LocationTag
                isMunicipalityOnly={activity.isMunicipalityOnly}
                locationId={activity.locationId}
              />
              {activity.cancelledAt && (
                <Tag colorScheme="red">{tc('event.cancelled.tag')}</Tag>
              )}
              {activity.isArchived && (
                <Tag colorScheme="red">{tc('event.archived.tag')}</Tag>
              )}
            </Tags>
          )}
          <Title>{activity.title}</Title>
          {activity.subTitle && <SubTitle>{activity.subTitle}</SubTitle>}
          {activity.cancelledAt && (
            <Cancelled role="status">
              <strong>{tc('event.cancelled.notice')}</strong>
              {activity.cancelMessage && <p>{activity.cancelMessage}</p>}
            </Cancelled>
          )}
          {activity.isArchived && (
            <Notice>{tc('event.archived.onlyYou')}</Notice>
          )}
          {(occurrence || venue) && (
            <Facts>
              {occurrence && (
                <Fact>
                  <CalendarIcon aria-hidden />
                  <div>
                    <FactText>{formatOccurrence(occurrence)}</FactText>
                    {dates.length > 1 ? (
                      <FactNote>
                        {tc('event.dates.occurrences', {
                          count: dates.length,
                        })}
                      </FactNote>
                    ) : (
                      isPastOccurrence(occurrence) && (
                        <FactNote>{tc('event.register.past')}</FactNote>
                      )
                    )}
                  </div>
                </Fact>
              )}
              {venue && (
                <Fact>
                  <MapPinIcon aria-hidden />
                  <div>
                    <FactText>
                      {activity.resource && activity.resourceId ? (
                        <Link to={sitePath('resources', activity.resourceId)}>
                          {venue}
                        </Link>
                      ) : (
                        venue
                      )}
                    </FactText>
                    {activity.resource &&
                      activity.place &&
                      activity.place !== activity.resource && (
                        <FactNote>{activity.place}</FactNote>
                      )}
                  </div>
                </Fact>
              )}
            </Facts>
          )}
        </HeroText>
      </Hero>

      <Layout>
        <Column>
          {activity.longDescription && (
            <Section order={2} title={tc('event.sections.about')}>
              <Description className="text-content">
                {HTMLReactParser(DOMPurify.sanitize(activity.longDescription))}
              </Description>
            </Section>
          )}

          {isPublicActivity && occurrence && (
            <RegistrationSection
              activity={activity}
              occurrence={occurrence}
              occurrenceIndex={selectedIndex}
              onChanged={() => revalidator.revalidate()}
            />
          )}

          {/* A mirrored event's sign-ups are kept at its source */}
          {isPublicActivity &&
            occurrence &&
            !(
              activity.mirror &&
              activity.isRegistrationEnabled === false &&
              !occurrence.attendees?.length
            ) && <AttendeesSection attendees={occurrence.attendees} />}

          {isPublicActivity && (
            <FollowSection
              activity={activity}
              isOver={dates.every((date) => isPastOccurrence(date))}
            />
          )}

          {isOrganizer && (
            <OrganizerToolsSection
              activity={activity}
              occurrence={occurrence}
            />
          )}
        </Column>

        <Column side>
          {/* One date is already told at the top; several are chosen here */}
          {dates.length > 1 && (
            <WhenSection
              dates={dates}
              selectedIndex={selectedIndex}
              onSelect={selectDate}
            />
          )}
          <PlaceSection activity={activity} locationName={locationName} />
          <OrganizerSection activity={activity} />
        </Column>
      </Layout>
    </Page>
  );
}
