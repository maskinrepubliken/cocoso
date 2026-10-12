import React, { useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Helmet } from 'react-helmet';
import { Trans } from 'react-i18next';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

import { styled } from '/stitches.config';
import { Button } from '/imports/ui/core';
import { publicUrl } from '/imports/api/_utils/shared';
import PlaceholderImage from '/imports/ui/generic/PlaceholderImage';
import { getImageUrl, getImageUrlBest } from '/imports/ui/utils/imageHelper';

import BackLink, { BackLinkData } from './BackLink';

// The parts of an entry page — an organizer, a förening, a place or a
// request: a card at the top with the picture on a green band and beside it
// what the entry is, then sections below in a column as wide as the card.

export const WIDE = '@media (min-width: 760px)';

export const EntryPage = styled('div', {
  boxSizing: 'border-box',
  margin: '0 auto',
  maxWidth: '1180px',
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
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '20px',
  boxShadow: 'var(--cocoso-skugga)',
  display: 'grid',
  margin: '0 auto 2rem',
  maxWidth: '980px',
  overflow: 'hidden',
  [WIDE]: { gridTemplateColumns: '300px minmax(0, 1fr)' },
});

const Band = styled('div', {
  alignItems: 'center',
  background:
    'linear-gradient(160deg, var(--cocoso-colors-theme-100), var(--cocoso-colors-theme-200))',
  display: 'flex',
  justifyContent: 'center',
  padding: '1.75rem 1rem',
  [WIDE]: { padding: '2rem 1.5rem' },
});

const About = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '1.5rem 1.25rem 1.75rem',
  [WIDE]: { padding: '2rem 2.25rem 2.25rem' },
});

const Round = styled('div', {
  aspectRatio: '1 / 1',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: '50%',
  boxShadow: '0 14px 30px -18px rgba(20, 50, 20, 0.7)',
  overflow: 'hidden',
  padding: '5px',
  width: '160px',
  [WIDE]: { width: '220px' },
  '& > *': {
    borderRadius: '50%',
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    overflow: 'hidden',
    width: '100%',
  },
});

const Framed = styled('div', {
  aspectRatio: '4 / 3',
  background: 'var(--cocoso-colors-theme-700)',
  borderRadius: '18px',
  boxShadow: '0 14px 30px -18px rgba(20, 50, 20, 0.7)',
  overflow: 'hidden',
  padding: '5px',
  width: '100%',
  maxWidth: '320px',
  [WIDE]: { maxWidth: 'none' },
  '& > *': {
    borderRadius: '13px',
    display: 'block',
    height: '100%',
    objectFit: 'cover',
    overflow: 'hidden',
    width: '100%',
  },
});

const IconCircle = styled('div', {
  alignItems: 'center',
  borderRadius: '50%',
  boxShadow: '0 14px 30px -18px rgba(20, 50, 20, 0.7)',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  height: '140px',
  justifyContent: 'center',
  width: '140px',
  [WIDE]: { height: '180px', width: '180px' },
  '& svg': { height: '42%', width: '42%' },
});

export const Chips = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
});

export const Chip = styled('span', {
  alignItems: 'center',
  border: '1px solid currentColor',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-flex',
  fontSize: '0.78rem',
  fontWeight: 700,
  gap: '0.3rem',
  letterSpacing: '0.04em',
  padding: '0.15rem 0.65rem',
  '& svg': { height: '0.9rem', width: '0.9rem' },
  variants: {
    accent: {
      true: {
        backgroundColor: 'var(--cocoso-tegel)',
        borderColor: 'var(--cocoso-tegel)',
        color: 'white',
      },
    },
  },
});

const Title = styled('h1', {
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '2rem',
  fontVariationSettings: '"SOFT" 60',
  fontWeight: 600,
  lineHeight: 1.1,
  margin: 0,
  [WIDE]: { fontSize: '2.5rem' },
});

const Subtitle = styled('p', {
  fontSize: '1.1rem',
  lineHeight: 1.4,
  margin: 0,
});

export const Meta = styled('p', {
  alignItems: 'center',
  color: 'var(--cocoso-mylla-soft)',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: '0.95rem',
  gap: '0.35rem 1rem',
  margin: 0,
  '& span': { alignItems: 'center', display: 'inline-flex', gap: '0.3rem' },
  '& svg': { height: '0.95rem', width: '0.95rem' },
});

export const RichText = styled('div', {
  lineHeight: 1.6,
  maxWidth: '62ch',
  '& p': { margin: '0 0 0.6rem' },
  '& p:last-child': { marginBottom: 0 },
  '& em': { color: 'var(--cocoso-mylla-soft)', fontSize: '0.82rem' },
});

export const Actions = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.25rem',
});

export const PillLink = styled('a', {
  alignItems: 'center',
  border: '1.5px solid var(--cocoso-colors-theme-800)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-flex',
  fontSize: '0.92rem',
  fontWeight: 600,
  gap: '0.45rem',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  padding: '0.45rem 0.95rem',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '& svg': { flexShrink: 0, height: '1rem', width: '1rem' },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-theme-800)',
    color: 'white',
  },
  variants: {
    primary: {
      true: {
        backgroundColor: 'var(--cocoso-colors-theme-800)',
        color: 'white',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-900)' },
      },
    },
  },
});

// A column under the card, as wide as it.
export const EntryColumn = styled('section', {
  margin: '0 auto 2.5rem',
  maxWidth: '980px',
});

export const SectionHead = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1.5rem',
  justifyContent: 'space-between',
  marginBottom: '1rem',
  '& h2': {
    fontFamily: 'var(--cocoso-font-display)',
    fontSize: '1.6rem',
    fontVariationSettings: '"SOFT" 60',
    fontWeight: 600,
    margin: 0,
  },
});

// A white panel for a section's content.
export const Panel = styled('div', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '16px',
  boxShadow: 'var(--cocoso-skugga)',
  padding: '1.25rem 1.5rem',
  wordBreak: 'break-word',
});

const Gallery = styled('div', {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  '& img': {
    aspectRatio: '4 / 3',
    borderRadius: '14px',
    boxShadow: 'var(--cocoso-skugga)',
    display: 'block',
    objectFit: 'cover',
    width: '100%',
  },
});

export function ShareButton() {
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

export function EntryTopBar({ backLink }: { backLink?: BackLinkData | null }) {
  return (
    <TopBar>
      <BackLink backLink={backLink} />
      <ShareButton />
    </TopBar>
  );
}

export const plainText = (html?: string) =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

interface EntryMetaProps {
  title?: string;
  description?: string;
  image?: string;
  path: string;
  type?: string;
}

// What the page says about itself to browsers and link previews.
export function EntryMeta({
  title,
  description = '',
  image,
  path,
  type = 'article',
}: EntryMetaProps) {
  const shareImage = getImageUrlBest(image);
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta property="og:title" content={title?.substring(0, 40)} />
      <meta property="og:url" content={publicUrl(path)} />
      <meta
        property="og:image"
        content={shareImage || publicUrl('/images/og-default.jpg')}
      />
      <meta property="og:description" content={description.substring(0, 150)} />
      <meta property="og:type" content={type} />
    </Helmet>
  );
}

interface PictureProps {
  src?: string | null;
  alt?: string;
  seed?: string;
}

const pictureOf = ({ src, alt, seed }: PictureProps) => {
  const url = src ? getImageUrl(src, 'medium') || src : null;
  return url ? (
    <img alt={alt || ''} src={url} />
  ) : (
    <PlaceholderImage seed={seed || alt || 'entry'} />
  );
};

export function RoundPicture(props: PictureProps) {
  return <Round>{pictureOf(props)}</Round>;
}

export function FramedPicture(props: PictureProps) {
  return <Framed>{pictureOf(props)}</Framed>;
}

export function IconPicture({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<any>;
  color?: string;
}) {
  return (
    <IconCircle css={{ background: color || 'var(--cocoso-papper)' }}>
      <Icon aria-hidden />
    </IconCircle>
  );
}

// Every picture after the first, which the card already shows.
export function MorePictures({ images, alt }: { images?: string[]; alt?: string }) {
  const rest = (images || []).slice(1).filter(Boolean);
  if (rest.length === 0) {
    return null;
  }
  return (
    <Gallery>
      {rest.map((src) => (
        <img
          key={src}
          alt={alt || ''}
          loading="lazy"
          src={getImageUrl(src, 'medium') || src}
        />
      ))}
    </Gallery>
  );
}

interface EntryHeroProps {
  picture: React.ReactNode;
  chips?: React.ReactNode;
  title?: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  // Sanitized and rendered as the body text.
  html?: string;
  children?: React.ReactNode;
}

export default function EntryHero({
  picture,
  chips,
  title,
  subtitle,
  meta,
  html,
  children,
}: EntryHeroProps) {
  return (
    <Hero>
      <Band>{picture}</Band>
      <About>
        {chips && <Chips>{chips}</Chips>}
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        {meta && <Meta>{meta}</Meta>}
        {html && (
          <RichText className="text-content">
            {HTMLReactParser(DOMPurify.sanitize(html))}
          </RichText>
        )}
        {children}
      </About>
    </Hero>
  );
}
