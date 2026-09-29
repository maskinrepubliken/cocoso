import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';
import { useRevalidator, useSearchParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { useAtomValue } from 'jotai';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

import { styled } from '/stitches.config';
import { Button, Tag } from '/imports/ui/core';
import type { Site } from '/imports/ui/types';
import { publicUrl } from '/imports/api/_utils/shared';
import {
  canCreateContentAtom,
  currentUserAtom,
  roleAtom,
} from '/imports/state';
import { useLocationTag } from '/imports/ui/utils/useLocation';

import NiceSlider from '../generic/NiceSlider';
import PlaceholderImage from '../generic/PlaceholderImage';
import { getImageUrlBest } from '../utils/imageHelper';
import BackLink from './BackLink';

import Section, { NARROW, WIDE } from '../pages/activities/event/Section';
import WhenSection from '../pages/activities/event/WhenSection';
import PlaceSection from '../pages/activities/event/PlaceSection';
import OrganizerSection from '../pages/activities/event/OrganizerSection';
import AttendeesSection from '../pages/activities/event/AttendeesSection';
import RegistrationSection from '../pages/activities/event/RegistrationSection';
import OrganizerToolsSection from '../pages/activities/event/OrganizerToolsSection';
import {
  Occurrence,
  pickOccurrenceIndex,
} from '../pages/activities/event/occurrences';

// The chat pulls in browser-only styles, so it is loaded on the client.
const ChatButton = loadable(() =>
  import('/imports/ui/chattery/ChatHandler').then((m) => ({
    default: m.ChatButton,
  }))
);

const Page = styled('div', {
  margin: '0 auto',
  maxWidth: '1080px',
  padding: '0 1rem 3rem',
  width: '100%',
});

const TopBar = styled('div', {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
});

const Hero = styled('header', {
  marginBottom: '1.5rem',
  textAlign: 'center',
});

const Title = styled('h1', {
  fontSize: '2rem',
  lineHeight: 1.15,
  margin: '0.25rem 0 0.5rem',
  [WIDE]: { fontSize: '2.5rem' },
});

const SubTitle = styled('p', {
  color: 'var(--cocoso-colors-gray-700)',
  fontSize: '1.15rem',
  margin: '0 0 0.75rem',
});

const Tags = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  justifyContent: 'center',
});

const ImageArea = styled('div', {
  borderRadius: 'var(--cocoso-border-radius)',
  margin: '0 auto 1.5rem',
  maxWidth: '900px',
  overflow: 'hidden',
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
  lineHeight: 1.6,
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
  isRegistrationDisabled?: boolean;
  capacity?: number;
  place?: string;
  resource?: string;
  resourceId?: string;
  address?: string;
  locationId?: string;
  datesAndTimes?: Occurrence[];
}

export interface ActivityHybridProps {
  activity: Activity;
  siteDoc: Site;
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      leftIcon={<LinkIcon />}
      size="lg"
      variant="ghost"
      css={{ fontWeight: 'normal' }}
      onClick={copy}
    >
      {copied ? (
        <Trans i18nKey="actions.copied" ns="common" />
      ) : (
        <Trans i18nKey="actions.share" ns="common" />
      )}
    </Button>
  );
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
  const canCreateContent = useAtomValue(canCreateContentAtom);

  const isOrganizer = Boolean(
    activity &&
      currentUser &&
      (role === 'admin' || activity.authorId === currentUser._id)
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

  const menu = siteDoc?.settings?.menu;
  const backLink = isPublicActivity
    ? {
        value: '/activities',
        label: menu?.find((item) => item.name === 'activities')?.label,
      }
    : {
        value: '/calendar',
        label: menu?.find((item) => item.name === 'calendar')?.label,
      };

  const images = (activity.images || [activity.imageUrl]).filter(
    (img): img is string => Boolean(img)
  );
  const url = publicUrl(
    `/${isPublicActivity ? 'activities' : 'calendar'}/${activity._id}`
  );
  const description = activity.subTitle || activity.title;
  const imageUrl = getImageUrlBest(images[0]);

  return (
    <Page>
      <Helmet>
        <title>{activity.title}</title>
        <meta name="title" content={activity.title} />
        <meta name="description" content={description} />
        <meta property="og:title" content={activity.title?.substring(0, 40)} />
        <meta property="og:url" content={url} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        <meta
          property="og:description"
          content={description?.substring(0, 150)}
        />
        <meta property="og:type" content="article" />
      </Helmet>

      <TopBar>
        <BackLink backLink={backLink} />
        <ShareButton />
      </TopBar>

      <Hero>
        <Title>{activity.title}</Title>
        {activity.subTitle && <SubTitle>{activity.subTitle}</SubTitle>}
        {locationName && (
          <Tags>
            <Tag colorScheme="gray">{locationName}</Tag>
          </Tags>
        )}
      </Hero>

      {isPublicActivity && (
        <ImageArea>
          {images.length > 0 ? (
            <NiceSlider alt={activity.title} images={images} />
          ) : (
            <PlaceholderImage
              seed={activity._id}
              style={{ height: '180px', width: '100%' }}
            />
          )}
        </ImageArea>
      )}

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

          {isPublicActivity && occurrence && (
            <AttendeesSection attendees={occurrence.attendees} />
          )}

          {isOrganizer && (
            <OrganizerToolsSection
              activity={activity}
              occurrence={occurrence}
            />
          )}

          {currentUser && canCreateContent && isPublicActivity && (
            <Section
              aside={tc('event.discussion.onlyVerified')}
              order={8}
              title={tc('event.sections.discussion')}
            >
              <ChatButton
                context="activities"
                currentUser={currentUser}
                item={activity}
                title={tc('event.sections.discussion')}
                withInput
              />
            </Section>
          )}
        </Column>

        <Column side>
          {dates.length > 0 && (
            <WhenSection
              dates={dates}
              selectedIndex={selectedIndex}
              onSelect={selectDate}
            />
          )}
          <PlaceSection activity={activity} locationName={locationName} />
          <OrganizerSection username={activity.authorName} />
        </Column>
      </Layout>
    </Page>
  );
}
