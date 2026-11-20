import React, { useEffect, useRef, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Address } from '/imports/api/_utils/address';
import { useAtomValue } from 'jotai';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
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
import HeroActions from '../pages/activities/event/HeroActions';
import CalendarLink from '../pages/activities/event/CalendarLink';
import MoreEvents from '../pages/activities/event/MoreEvents';
import {
  Occurrence,
  formatOccurrence,
  isPastOccurrence,
  pickOccurrenceIndex,
} from '../pages/activities/event/occurrences';
import { sitePath } from '/imports/api/_utils/paths';

const Page = styled('div', {
  margin: '0 auto',
  maxWidth: '1600px',
  padding: '0 1rem 3rem',
  width: '100%',
  [WIDE]: { padding: '0 var(--cocoso-gutter) 3rem' },
});

// Everything about the event itself in one card: the picture on top, then
// what it is, when and where, the description, the dates to choose
// between and who is coming. On a phone the card runs edge to edge and
// starts at the very top, its picture behind the header (52px tall there).
const MainCard = styled('article', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga)',
  overflow: 'hidden',
  [NARROW]: { borderRadius: 0, margin: '-52px -1rem 0' },
  variants: {
    // A tall picture (a poster): beside the text instead of across the top
    poster: {
      true: {
        [WIDE]: {
          alignItems: 'start',
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, min(38%, 440px)) minmax(0, 1fr)',
        },
      },
    },
  },
});

// A picture taller than this (height / width) is taken for a poster
const POSTER_RATIO = 1.15;

const ImageBox = styled('div', {
  aspectRatio: '16 / 9',
  maxHeight: '460px',
  overflow: 'hidden',
  width: '100%',
  '& img': {
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  [NARROW]: { aspectRatio: '3 / 2' },
  variants: {
    // A poster is shown whole, never cropped. On wide screens at its own
    // height in the card's left column; on a phone it stands on a blurred
    // copy of itself (--poster), which is what lies behind the header.
    poster: {
      true: {
        [WIDE]: {
          aspectRatio: 'auto',
          maxHeight: 'none',
          '& img': { height: 'auto' },
        },
        [NARROW]: {
          aspectRatio: 'auto',
          boxSizing: 'border-box',
          maxHeight: 'none',
          padding: '60px 1.5rem 1.25rem',
          position: 'relative',
          '&::before': {
            backgroundImage: 'var(--poster)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            content: '""',
            filter: 'blur(22px) brightness(0.75)',
            inset: '-30px',
            position: 'absolute',
          },
          '& img': {
            borderRadius: '6px',
            boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.55)',
            height: 'auto',
            margin: '0 auto',
            maxHeight: '70vh',
            maxWidth: '100%',
            objectFit: 'contain',
            width: 'auto',
          },
        },
      },
    },
  },
});

const CardBody = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  padding: '1.25rem 1rem 1.5rem',
  [WIDE]: { padding: '1.75rem 2rem 2rem' },
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
  marginTop: '1.25rem',
});

// On wide screens two columns: on the left the event's card and, for the
// organizer, the tools under it; in a narrow column on the right what one
// does about it (sign up, follow) and where it is and who organizes it.
// On narrow screens the right column follows the left.
const Layout = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  [WIDE]: {
    alignItems: 'start',
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)',
  },
});

const Column = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  minWidth: 0,
});

// Signing up and following: one card in the site's green, apart from the
// plain card with facts under it. No titles: the form and the buttons say
// what they are.
const ActionCard = styled('div', {
  background:
    'linear-gradient(165deg, var(--cocoso-colors-theme-50), var(--cocoso-colors-theme-100))',
  border: '1.5px solid var(--cocoso-colors-theme-200)',
  borderRadius: 'var(--cocoso-radius-kort)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  padding: '1.5rem',
  '&:empty': { display: 'none' },
  '& section + section': {
    borderTop: '1px solid var(--cocoso-colors-theme-200)',
    paddingTop: '1.5rem',
  },
});

// Where and who, as one card: each section keeps its title and contents,
// with a line between them
const FactsCard = styled('div', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga)',
  overflow: 'hidden',
  '&:empty': { display: 'none' },
  '& > section': { borderRadius: 0, boxShadow: 'none' },
  '& > section + section': {
    borderTop: '1px solid var(--cocoso-colors-theme-100)',
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
  // The first picture's shape: height / width (activity.imageShape.js)
  imageShape?: { src: string; ratio?: number };
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
export default function ActivityHybrid({
  activity,
  siteDoc,
}: ActivityHybridProps) {
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

  // The picture's own shape decides the layout: a tall one is a poster.
  // The server sends the shape with the event (imageShape), so the page
  // is laid out right from the start; a picture it could not measure is
  // measured here once it has loaded.
  const firstImage = activity?.images?.[0] || activity?.imageUrl;
  const storedRatio =
    activity?.imageShape?.src === firstImage
      ? activity?.imageShape?.ratio
      : undefined;
  const imageRef = useRef<HTMLImageElement>(null);
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);
  const measureImage = () => {
    const image = imageRef.current;
    if (image?.naturalWidth) {
      setMeasuredRatio(image.naturalHeight / image.naturalWidth);
    }
  };
  useEffect(() => {
    setMeasuredRatio(null);
    if (!storedRatio && imageRef.current?.complete) {
      measureImage();
    }
  }, [firstImage]);
  const isPoster = (storedRatio || measuredRatio || 0) > POSTER_RATIO;

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
  const heroImage = getImageUrl(images[0], 'medium') || images[0];
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

  // The kind of event and the ort, under the description
  const tags = (kinds.length > 0 ||
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
  );

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

      <Layout>
        <Column>
          <MainCard poster={isPoster}>
            {isPublicActivity && (
              <ImageBox
                poster={isPoster}
                style={
                  isPoster
                    ? ({
                        '--poster': `url("${heroImage}")`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {images.length > 0 ? (
                  <LightboxProvider alt={activity.title} images={images}>
                    <LightboxTrigger showCount src={images[0]}>
                      <img
                        ref={imageRef}
                        alt={activity.title}
                        src={heroImage}
                        onLoad={storedRatio ? undefined : measureImage}
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
            <CardBody>
              <HeroText>
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
              </HeroText>

              {/* When: the chosen date and, for several, the dates to
                  choose between */}
              {dates.length > 0 && (
                <WhenSection
                  dates={dates}
                  selectedIndex={selectedIndex}
                  onSelect={selectDate}
                />
              )}

              {isPublicActivity && occurrence && (
                <HeroActions activity={activity} occurrence={occurrence} />
              )}

              {activity.longDescription && (
                <Section
                  hideTitle
                  look="plain"
                  order={2}
                  title={tc('event.sections.about')}
                >
                  <Description className="text-content">
                    {HTMLReactParser(
                      DOMPurify.sanitize(activity.longDescription)
                    )}
                  </Description>
                  {tags}
                </Section>
              )}
              {!activity.longDescription && tags}

              {/* Without sign-up here (switched off, or kept at a mirrored
                  event's source) there is nobody to list */}
              {isPublicActivity &&
                occurrence &&
                !(
                  (activity.isRegistrationDisabled ||
                    activity.isRegistrationEnabled === false) &&
                  !occurrence.attendees?.length
                ) && <AttendeesSection attendees={occurrence.attendees} />}
            </CardBody>
          </MainCard>

          {isOrganizer && (
            <OrganizerToolsSection
              activity={activity}
              occurrence={occurrence}
            />
          )}
        </Column>

        <Column>
          {isPublicActivity && (
            <ActionCard>
              {occurrence && (
                <RegistrationSection
                  activity={activity}
                  occurrence={occurrence}
                  occurrenceIndex={selectedIndex}
                  onChanged={() => revalidator.revalidate()}
                />
              )}
              <FollowSection
                activity={activity}
                isOver={dates.every((date) => isPastOccurrence(date))}
              >
                <CalendarLink
                  activity={activity}
                  occurrence={occurrence}
                  url={publicUrl(path)}
                />
              </FollowSection>
            </ActionCard>
          )}
          <FactsCard>
            <PlaceSection activity={activity} locationName={locationName} />
            <OrganizerSection activity={activity} />
          </FactsCard>
        </Column>
      </Layout>

      {isPublicActivity && (
        <MoreEvents activity={activity} siteName={siteDoc?.settings?.name} />
      )}
    </Page>
  );
}
