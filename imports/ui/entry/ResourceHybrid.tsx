import { Link, type To } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import UsersIcon from 'lucide-react/dist/esm/icons/users';
import { LightboxProvider } from '/imports/ui/generic/Lightbox';

import { styled } from '/stitches.config';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import BookingInfo, {
  type BookingWithPerson,
} from '/imports/ui/pages/resources/components/BookingInfo';
import type { Document, Site } from '/imports/ui/types';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import AddressBlock from '/imports/ui/generic/AddressBlock';
import { useAtomValue } from 'jotai';
import { locationsAtom } from '/imports/state';
import useOpenEntry from '/imports/ui/listing/useOpenEntry';
import SexyThumb from '/imports/ui/listing/SexyThumb';
import {
  PersonAvatar,
  personName,
  type Person,
} from '/imports/ui/pages/activities/form/PersonCard';
import EventCards from './EventCards';
import {
  AddressDetails,
  ContactDetails,
} from '/imports/ui/generic/ContactDetails';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { hasContact, type Contact } from '/imports/api/_utils/contact';

import LocationTag from '/imports/ui/generic/LocationTag';
import BookableChip from '/imports/ui/generic/BookableChip';
import { publicUrl } from '/imports/api/_utils/shared';
import { resourceShareImageUrl } from '/imports/api/share/shareImage';
import { shareText } from '/imports/ui/layout/ShareMeta';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { placeStructuredData } from '/imports/ui/utils/structuredData';

import PlaceOfferings, {
  OfferingHours,
  type PlaceOffering,
} from './PlaceOfferings';
import type { Opening } from '/imports/ui/pages/businesses/hours';
import EntryHero, {
  Chip,
  EntryColumn,
  EntryMeta,
  EntryPage,
  EntryTopBar,
  FilledPicture,
  MorePictures,
  Panel,
  SectionHead,
  plainText,
} from './EntryHero';

interface Resource {
  _id: string;
  label?: string;
  address?: Partial<Address> | null;
  contact?: Contact | null;
  description?: string;
  imageUrl?: string;
  images?: string[];
  capacity?: number;
  booking?: BookingWithPerson | null;
  locationId?: string;
  kinds?: string[] | null;
  category?: { key?: string } | null;
  // The place it is part of, and the places that are part of it
  partOf?: PlaceLink | null;
  parts?: PlaceLink[];
  // A commercial place (Äta, handla & bo): its tagline and the defaults
  // of what it offers, and what it offers
  isCommercial?: boolean;
  commerce?: {
    tagline?: string;
    contact?: Contact | null;
    openingHours?: Opening[];
    hoursNote?: string;
  } | null;
  offerings?: PlaceOffering[];
}

interface PlaceLink {
  _id: string;
  label: string;
  images?: string[];
  booking?: object | null;
  isUnlisted?: boolean;
  address?: Partial<Address> | null;
}

export interface ResourceHybridProps {
  documents?: Document[];
  resource: Resource;
  siteDoc: Site;
  // The organizers linked to the place, shown under "Se även"
  organizers?: Person[];
  // What is coming up here and in the places in it
  upcoming?: any[];
  // Shown on another page (an organizer's): the cards only, without "Se
  // även" and events, and with "Läs mer" to the place's page
  embedded?: boolean;
}

// On an organizer's page: on to the place's own page
const ReadMore = styled(Link, {
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-block',
  fontWeight: 700,
  marginTop: '1rem',
  textDecorationThickness: '1.5px',
  textUnderlineOffset: '3px',
});

// "Se även": the organizers linked to the place, each a link to their page
const SeeAlso = styled('ul', {
  display: 'grid',
  gap: '0.5rem',
  listStyle: 'none',
  margin: '0.75rem 0 0',
  padding: 0,
  '& a': {
    alignItems: 'center',
    borderRadius: '12px',
    color: 'var(--site-ink)',
    display: 'flex',
    fontWeight: 600,
    gap: '0.75rem',
    padding: '0.35rem 0.5rem 0.35rem 0.35rem',
    textDecoration: 'none',
  },
  '& a:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
});

// What is coming up at the place, as the events listing's cards
function PlaceEvents({ events }: { events: any[] }) {
  const [tc] = useTranslation('common');
  const locations = useAtomValue(locationsAtom);
  const openEntry = useOpenEntry('activities');
  const locationNameOf = (item: any) =>
    locations.find((l) => l._id === item.locationId)?.name;
  return (
    <EntryColumn>
      <SectionHead>
        <h2>{tc('entry.events')}</h2>
      </SectionHead>
      <EventCards>
        {events.map((item, index) => (
          <div
            key={item._id}
            style={{ cursor: 'pointer' }}
            onClick={() => openEntry(item)}
          >
            <SexyThumb
              activity={item}
              index={index}
              tags={[locationNameOf(item)].filter(Boolean) as string[]}
            />
          </div>
        ))}
      </EventCards>
    </EntryColumn>
  );
}

// A place inside this one: its name, and its picture at the right
const PartCard = styled(Link, {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '16px',
  boxShadow: 'var(--cocoso-skugga)',
  color: 'var(--site-ink)',
  display: 'flex',
  gap: '1rem',
  minHeight: '88px',
  overflow: 'hidden',
  paddingLeft: '1.25rem',
  textDecoration: 'none',
  transition: 'transform 0.15s ease',
  '&:hover': { transform: 'translateY(-2px)' },
});

const PartText = styled('span', {
  alignItems: 'flex-start',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: '0.4rem',
  minWidth: 0,
  padding: '0.75rem 0',
});

const PartName = styled('span', {
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '1.15rem',
  fontWeight: 700,
  lineHeight: 1.2,
});

const PartPicture = styled('span', {
  alignSelf: 'stretch',
  flex: 'none',
  overflow: 'hidden',
  position: 'relative',
  width: '108px',
  '& img, & > *': {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    width: '100%',
  },
});

export const PartCards = styled('div', {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
});

// A place as a small card: its name (and whether it can be booked) and
// its picture at the right, under "Här finns" for the parts.
export function PlaceCard({ place, to }: { place: PlaceLink; to: To }) {
  const src = getImageUrl(place.images?.[0], 'small');
  return (
    <PartCard preventScrollReset to={to}>
      <PartText>
        <PartName>{place.label}</PartName>
        <BookableChip place={place} />
      </PartText>
      {/* A room or the like without a picture: just the white card */}
      {src && (
        <PartPicture>
          <img alt="" src={src} />
        </PartPicture>
      )}
    </PartCard>
  );
}

// The picture area of a part without a picture of its own: plain white,
// no generated placeholder. On narrow screens, where the picture sits on
// top of the card, it takes no room at all.
const NoPicture = styled('div', {
  backgroundColor: 'var(--cocoso-papper)',
  minHeight: '100%',
  width: '100%',
  '@media (max-width: 759px)': { display: 'none' },
});

// In the sidebar of a part, the place it is in: its picture from edge to
// edge at the top of the card, then "Del av" right above its name.
const ParentLink = styled(Link, {
  color: 'var(--site-ink)',
  display: 'block',
  textDecoration: 'none',
  '&:hover h3': { textDecoration: 'underline' },
  '& h3': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.35rem',
    fontWeight: 700,
    lineHeight: 1.2,
    margin: '0.3rem 0 0',
  },
});

const ParentPicture = styled('div', {
  height: '170px',
  margin: '-1.25rem -1.5rem 1.25rem',
  overflow: 'hidden',
  position: 'relative',
  '& img, & > *': {
    height: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    width: '100%',
  },
});

// From this width where the place is (map, address) and who to ask sit in
// a column beside the card, from the top of the page; below it they follow
// the card.
const SIDEBAR = '@media (min-width: 1024px)';

const Layout = styled('div', {
  display: 'grid',
  gridTemplateAreas: '"card" "side" "rest"',
  gridTemplateColumns: 'minmax(0, 1fr)',
  [SIDEBAR]: {
    columnGap: '2rem',
    gridTemplateAreas: '"card side" "rest side"',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gridTemplateRows: 'auto 1fr',
  },
});

const CardArea = styled('div', { gridArea: 'card', minWidth: 0 });
const DesktopOnly = styled('div', {
  display: 'none',
  [SIDEBAR]: { display: 'block' },
});
const MobileOnly = styled('div', {
  marginTop: '2.5rem',
  [SIDEBAR]: { display: 'none' },
});
const RestArea = styled('div', { gridArea: 'rest', minWidth: 0 });

const Sidebar = styled('aside', {
  gridArea: 'side',
  margin: '0 auto 2.5rem',
  maxWidth: '980px',
  width: '100%',
  [SIDEBAR]: {
    alignSelf: 'start',
    margin: 0,
    position: 'sticky',
    top: '1rem',
  },
});

// The same small heading as the sections of the event page.
const SideTitle = styled('h2', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: 0,
  textTransform: 'uppercase',
});

// A place's page: the card with its picture and what it is with, beside it,
// the address on a map and who to ask; then what it is made of, more
// pictures and documents.
export default function ResourceHybrid({
  documents,
  resource,
  siteDoc,
  organizers = [],
  upcoming = [],
  embedded = false,
}: ResourceHybridProps) {
  const [tc] = useTranslation('common');
  const prefix = useLocationPrefix();
  if (!resource) {
    return null;
  }

  const images = (
    resource.images?.length ? resource.images : [resource.imageUrl]
  ).filter((img): img is string => Boolean(img));

  // Back to the list it is in: Äta, handla & bo when it offers something
  const listing = resource.isCommercial ? 'businesses' : 'resources';
  const listingInMenu = siteDoc?.settings?.menu?.find(
    (item) => item.name === listing
  );

  // A shared link shows the generated picture with the name, kind,
  // description and address
  const path = `/resources/${resource._id}`;
  const shareImage = resourceShareImageUrl(resource) || undefined;

  const withContact = hasContact(resource.contact);
  // A commercial place's own hours and contact, which its offerings use
  // unless they have their own
  const commerce = resource.isCommercial ? resource.commerce : null;
  const withCommerce = Boolean(
    commerce?.openingHours?.length ||
      commerce?.hoursNote ||
      hasContact(commerce?.contact)
  );
  const kinds = [
    ...new Set((resource.offerings || []).map((offering) => offering.kind)),
  ];
  // A part of another place is where that place is: the card says so, and
  // the sidebar has no address or map of its own, only who to ask
  const { partOf } = resource;
  const withAddress = !partOf && hasAddress(resource.address);
  const parts = resource.parts || [];

  const partOfPanel = partOf ? (
    <Panel css={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
      <ParentLink to={`${prefix}/resources/${partOf._id}`}>
        <ParentPicture>
          {partOf.images?.[0] ? (
            <img alt="" src={getImageUrl(partOf.images[0], 'medium') || ''} />
          ) : (
            <PlaceholderImage seed={partOf._id} />
          )}
        </ParentPicture>
        <SideTitle as="p">{tc('entry.partOf')}</SideTitle>
        <h3>{partOf.label}</h3>
      </ParentLink>
      {/* Its address is this place's too */}
      <div style={{ marginTop: '0.75rem' }}>
        <AddressDetails address={partOf.address} />
      </div>
      {withContact && (
        <>
          <SideTitle css={{ margin: '1.5rem 0 1rem' }}>
            {tc('contact.title')}
          </SideTitle>
          <ContactDetails contact={resource.contact} />
        </>
      )}
    </Panel>
  ) : null;

  // The place's own cards: on its page, or (embedded) at the end of the
  // page of an organizer linked to it, with "Läs mer" to its page
  const body = (
    <Layout>
      <CardArea>
        <EntryHero
          chips={
            <>
              <LocationTag locationId={resource.locationId} />
              <BookableChip place={resource} />
              {kinds.map((kind) => (
                <Chip accent key={kind}>
                  {tc(`offerings.kinds.${kind}`)}
                </Chip>
              ))}
            </>
          }
          html={resource.description}
          subtitle={commerce?.tagline}
          meta={
            resource.capacity ? (
              <span>
                <UsersIcon aria-hidden />
                {tc('entry.capacity', { count: resource.capacity })}
              </span>
            ) : null
          }
          picture={
            partOf && !images.length ? (
              <NoPicture data-filled="" />
            ) : (
              <FilledPicture
                alt={resource.label}
                seed={resource._id}
                src={images[0]}
              />
            )
          }
          title={resource.label}
        >
          {embedded && (
            <ReadMore to={`${prefix}/resources/${resource._id}`}>
              {tc('entry.readMore')}
            </ReadMore>
          )}
        </EntryHero>
      </CardArea>

      {withAddress ||
      partOf ||
      withContact ||
      withCommerce ||
      resource.booking ||
      organizers.length ? (
        <Sidebar
          css={
            // Only the part-of card, which a phone shows last
            partOf && !resource.booking && !organizers.length && !withCommerce
              ? { display: 'none', [SIDEBAR]: { display: 'block' } }
              : undefined
          }
        >
          {/* A part: the place it is in stands for the address, in one
              card with who to ask. On a phone it comes last on the page. */}
          {partOf && <DesktopOnly>{partOfPanel}</DesktopOnly>}
          {withAddress && (
            <Panel css={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
              <AddressBlock
                address={resource.address}
                contact={resource.contact}
                edge="top"
                heading={
                  <SideTitle>
                    {tc(
                      withContact ? 'address.titleWithContact' : 'address.title'
                    )}
                  </SideTitle>
                }
                label={resource.label}
              />
            </Panel>
          )}
          {/* A commercial place: when it is open, and how to reach it */}
          {withCommerce && (
            <Panel css={{ marginBottom: '1.25rem' }}>
              {(commerce?.openingHours?.length || commerce?.hoursNote) && (
                <OfferingHours
                  hours={commerce.openingHours}
                  note={commerce.hoursNote}
                />
              )}
              {hasContact(commerce?.contact) && (
                <>
                  <SideTitle
                    css={
                      commerce?.openingHours?.length || commerce?.hoursNote
                        ? { margin: '1.5rem 0 1rem' }
                        : undefined
                    }
                  >
                    {tc('contact.title')}
                  </SideTitle>
                  <ContactDetails contact={commerce?.contact} />
                </>
              )}
            </Panel>
          )}
          {/* How to book it, under where it is */}
          {resource.booking && (
            <Panel>
              <SideTitle>{tc('entry.booking')}</SideTitle>
              <BookingInfo booking={resource.booking} label={resource.label} />
            </Panel>
          )}
          {/* The organizers linked to it: just "Se även" */}
          {organizers.length > 0 && (
            <Panel css={{ marginTop: resource.booking ? '1.25rem' : 0 }}>
              <SideTitle>{tc('entry.seeAlso')}</SideTitle>
              <SeeAlso>
                {organizers.map((person) => (
                  <li key={person._id}>
                    <Link to={`/@${person.username}`}>
                      <PersonAvatar person={person} size={40} />
                      <span>{personName(person)}</span>
                    </Link>
                  </li>
                ))}
              </SeeAlso>
            </Panel>
          )}
        </Sidebar>
      ) : null}

      <RestArea>
        {/* What it offers, first, as part of the place */}
        <PlaceOfferings offerings={resource.offerings} />

        {/* The places in it, listed or not, a card each */}
        {parts.length > 0 && (
          <EntryColumn>
            <SectionHead>
              <h2>{tc('entry.parts')}</h2>
            </SectionHead>
            <PartCards>
              {parts.map((part) => (
                <PlaceCard
                  key={part._id}
                  place={part}
                  to={
                    // Not in the list: it opens over this page
                    part.isUnlisted
                      ? { search: `?part=${part._id}` }
                      : `${prefix}/resources/${part._id}`
                  }
                />
              ))}
            </PartCards>
          </EntryColumn>
        )}

        {images.length > 1 && (
          <EntryColumn>
            <SectionHead>
              <h2>{tc('entry.pictures')}</h2>
            </SectionHead>
            <MorePictures alt={resource.label} images={images} />
          </EntryColumn>
        )}

        {documents && documents[0] && (
          <EntryColumn>
            <SectionHead>
              <h2>
                <Trans i18nKey="common:documents.label">Documents</Trans>
              </h2>
            </SectionHead>
            <Panel>
              <DocumentsField
                contextType="resources"
                contextId={resource._id}
              />
            </Panel>
          </EntryColumn>
        )}
        {/* Last, what is on here */}
        {upcoming.length > 0 && <PlaceEvents events={upcoming} />}
        {partOf && <MobileOnly>{partOfPanel}</MobileOnly>}
      </RestArea>
    </Layout>
  );

  if (embedded) {
    return (
      <LightboxProvider alt={resource.label} images={images}>
        {body}
      </LightboxProvider>
    );
  }

  return (
    <LightboxProvider alt={resource.label} images={images}>
      <EntryPage>
        <EntryMeta
          description={plainText(resource.description)}
          image={shareImage}
          generatedImage
          path={path}
          title={resource.label}
          type="website"
          coordinates={resource.address?.coordinates}
          structuredData={placeStructuredData({
            name: resource.label,
            description: shareText(resource.description, 300),
            url: publicUrl(path),
            image: getImageUrl(images[0], 'full') || shareImage,
            coordinates: resource.address?.coordinates,
            address: resource.address,
          })}
        />

        <EntryTopBar
          backLink={{ value: `/${listing}`, label: listingInMenu?.label }}
        />

        {body}
      </EntryPage>
    </LightboxProvider>
  );
}
