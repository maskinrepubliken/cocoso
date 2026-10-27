import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { styled } from '/stitches.config';
import AddressBlock from '/imports/ui/generic/AddressBlock';
import LocationTag from '/imports/ui/generic/LocationTag';
import { LightboxProvider } from '/imports/ui/generic/Lightbox';
import { hasAddress, type Address } from '/imports/api/_utils/address';
import { hasContact, type Contact } from '/imports/api/_utils/contact';
import { Status } from '/imports/ui/listing/BusinessesHybrid';
import {
  Opening,
  WEEK,
  formatDay,
  formatTime,
  isoDay,
  openState,
  useNow,
} from '/imports/ui/pages/businesses/hours';
import type { Site } from '/imports/ui/types';

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

interface MenuSection {
  title: string;
  items: { name: string; description?: string; price?: string }[];
}

interface Business {
  _id: string;
  label: string;
  kinds?: string[];
  tagline?: string;
  description?: string;
  address?: Partial<Address> | null;
  contact?: Contact | null;
  images?: string[];
  locationId?: string;
  isMunicipalityOnly?: boolean;
  openingHours?: Opening[];
  hoursNote?: string;
  menu?: MenuSection[];
  isExample?: boolean;
}

export interface BusinessHybridProps {
  business: Business;
  siteDoc: Site;
}

// As on a place's page: from this width the hours and the address sit in a
// column beside the card, below it they follow the card.
const SIDEBAR = '@media (min-width: 1024px)';

const Layout = styled('div', {
  display: 'grid',
  gridTemplateAreas: '"card" "side" "rest"',
  gridTemplateColumns: 'minmax(0, 1fr)',
  [SIDEBAR]: {
    columnGap: '2rem',
    gridTemplateAreas: '"card side" "rest side"',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gridTemplateRows: 'auto 1fr',
  },
});

const CardArea = styled('div', { gridArea: 'card', minWidth: 0 });
const RestArea = styled('div', { gridArea: 'rest', minWidth: 0 });

const Sidebar = styled('aside', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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

const SideTitle = styled('h2', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: '0 0 0.75rem',
  textTransform: 'uppercase',
});

const Days = styled('dl', {
  display: 'grid',
  gap: '0.3rem 1rem',
  gridTemplateColumns: 'auto 1fr',
  margin: 0,
  '& dt': { textTransform: 'capitalize' },
  '& dd': { margin: 0, textAlign: 'right' },
  '& .today': { fontWeight: 700 },
  '& .closed': { color: 'var(--cocoso-mylla-soft)' },
});

const Note = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.88rem',
  margin: '0.75rem 0 0',
});

const MenuGrid = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
});

const MenuItems = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.7rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

// Name and price on one line, joined by a dotted leader.
const ItemLine = styled('div', {
  alignItems: 'baseline',
  display: 'flex',
  gap: '0.4rem',
  '& strong': { fontWeight: 600 },
  '& .leader': {
    borderBottom: '1.5px dotted rgba(60, 40, 20, 0.3)',
    flex: 1,
    minWidth: '1rem',
    transform: 'translateY(-0.25rem)',
  },
  '& .price': { fontWeight: 600, whiteSpace: 'nowrap' },
});

const ItemText = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  fontSize: '0.88rem',
  lineHeight: 1.4,
  margin: '0.15rem 0 0',
});

const weekdayName = (day: number) => dayjs().day(day % 7).format('dddd');

function Hours({ business }: { business: Business }) {
  const { t } = useTranslation('common');
  const now = useNow();
  const today = now ? isoDay(now) : null;
  const state = now ? openState(business.openingHours, now) : null;

  return (
    <Panel>
      <SideTitle>{t('businesses.hours')}</SideTitle>
      {state && (
        <p style={{ margin: '0 0 0.75rem' }}>
          {state.open ? (
            <Status open>
              {t('businesses.openNow')} ·{' '}
              {t('businesses.closesAt', { time: formatTime(state.closes) })}
            </Status>
          ) : (
            <Status open={false}>
              {t('businesses.closedNow')}
              {state.next &&
                ` · ${t('businesses.opensAt', {
                  day:
                    state.next.day === today
                      ? t('businesses.today').toLowerCase()
                      : weekdayName(state.next.day),
                  time: formatTime(state.next.opens),
                })}`}
            </Status>
          )}
        </p>
      )}
      <Days>
        {WEEK.map((day) => {
          const hours = formatDay(business.openingHours, day);
          const classes = [day === today ? 'today' : '', hours ? '' : 'closed']
            .filter(Boolean)
            .join(' ');
          return (
            <React.Fragment key={day}>
              <dt className={classes}>
                {day === today ? t('businesses.today') : weekdayName(day)}
              </dt>
              <dd className={classes}>{hours || t('businesses.closed')}</dd>
            </React.Fragment>
          );
        })}
      </Days>
      {business.hoursNote && <Note>{business.hoursNote}</Note>}
    </Panel>
  );
}

// A café, restaurant, shop or inn: the card with its picture and what it
// is, the opening hours and address beside it, then the menu.
export default function BusinessHybrid({
  business,
  siteDoc,
}: BusinessHybridProps) {
  const { t } = useTranslation('common');
  const images = (business.images || []).filter(Boolean);
  const inMenu = siteDoc?.settings?.menu?.find(
    (item) => item.name === 'businesses'
  );
  const menuTitle = t(
    `businesses.menu.${business.kinds?.includes('eat') ? 'eat' : business.kinds?.[0] || 'eat'}`
  );
  const withAddress = hasAddress(business.address as Address);
  const withContact = hasContact(business.contact);

  return (
    <LightboxProvider alt={business.label} images={images}>
      <EntryPage>
        <EntryMeta
          description={business.tagline || plainText(business.description)}
          image={images[0]}
          path={`/businesses/${business._id}`}
          title={business.label}
        />

        <EntryTopBar
          backLink={{ value: '/businesses', label: inMenu?.label }}
        />

        <Layout>
          <CardArea>
            <EntryHero
              chips={
                <>
                  {business.kinds?.map((kind) => (
                    <Chip key={kind} accent>
                      {t(`businesses.kinds.${kind}`)}
                    </Chip>
                  ))}
                  <LocationTag
                    isMunicipalityOnly={business.isMunicipalityOnly}
                    locationId={business.locationId}
                  />
                </>
              }
              html={business.description}
              picture={
                <FilledPicture
                  alt={business.label}
                  seed={business._id}
                  src={images[0]}
                />
              }
              subtitle={business.tagline}
              title={business.label}
            />
          </CardArea>

          <Sidebar>
            <Hours business={business} />
            {withAddress || withContact ? (
              <Panel css={{ overflow: 'hidden' }}>
                <AddressBlock
                  address={business.address}
                  contact={business.contact}
                  edge="top"
                  heading={
                    <SideTitle>
                      {t(
                        withContact
                          ? 'address.titleWithContact'
                          : 'address.title'
                      )}
                    </SideTitle>
                  }
                  label={business.label}
                />
              </Panel>
            ) : null}
          </Sidebar>

          <RestArea>
            {business.menu && business.menu.length > 0 && (
              <EntryColumn>
                <SectionHead>
                  <h2>{menuTitle}</h2>
                </SectionHead>
                <MenuGrid>
                  {business.menu.map((section) => (
                    <Panel key={section.title}>
                      <SideTitle>{section.title}</SideTitle>
                      <MenuItems>
                        {section.items.map((item) => (
                          <li key={item.name}>
                            <ItemLine>
                              <strong>{item.name}</strong>
                              {item.price && (
                                <>
                                  <span aria-hidden className="leader" />
                                  <span className="price">{item.price}</span>
                                </>
                              )}
                            </ItemLine>
                            {item.description && (
                              <ItemText>{item.description}</ItemText>
                            )}
                          </li>
                        ))}
                      </MenuItems>
                    </Panel>
                  ))}
                </MenuGrid>
              </EntryColumn>
            )}

            {images.length > 1 && (
              <EntryColumn>
                <SectionHead>
                  <h2>{t('entry.pictures')}</h2>
                </SectionHead>
                <MorePictures alt={business.label} images={images} />
              </EntryColumn>
            )}
          </RestArea>
        </Layout>
      </EntryPage>
    </LightboxProvider>
  );
}
