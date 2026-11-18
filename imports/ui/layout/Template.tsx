import React from 'react';
import { Helmet } from 'react-helmet';

import { styled } from '/stitches.config';

export interface TemplateProps {
  heading?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  titleCentered?: boolean;
  children?: React.ReactNode;
}

const WIDE = '@media (min-width: 960px)';

// One column centred on a phone; from 960px three, the content in the
// middle. Decided by CSS, not by the screen size the browser reports: the
// server cannot know it, and a page loaded later (a 404, the terms) would
// otherwise hydrate with other markup than the server sent.
const Layout = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  justifyItems: 'center',
  padding: '0 1rem',
  [WIDE]: {
    gridTemplateColumns: '3fr 4fr 3fr',
    justifyItems: 'stretch',
    padding: '0.75rem',
  },
});

const Middle = styled('div', {
  minWidth: 0,
  width: '100%',
  maxWidth: '520px',
  [WIDE]: { maxWidth: 'none' },
});

const Title = styled('h1', {
  fontFamily: 'var(--cocoso-font-display)',
  fontVariationSettings: '"SOFT" 60',
  fontWeight: 600,
  fontSize: '1.4rem',
  margin: '1rem 0 0.5rem',
  [WIDE]: { fontSize: '1.9rem', margin: '0 0 1rem' },
  variants: {
    centered: { true: { textAlign: 'center' } },
  },
});

const Content = styled('div', { maxWidth: '520px' });

export default function Template({
  heading,
  leftContent,
  rightContent,
  titleCentered = false,
  children,
}: TemplateProps) {
  return (
    <>
      <Helmet>
        {/* HelmetHybrid adds " | <site name>" */}
        {heading && <title>{String(heading)}</title>}
      </Helmet>
      <Layout>
        <div>{leftContent}</div>
        <Middle>
          {heading && <Title centered={titleCentered}>{heading}</Title>}
          <Content>{children}</Content>
        </Middle>
        <div>{rightContent}</div>
      </Layout>
    </>
  );
}
