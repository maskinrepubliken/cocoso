import React, { useEffect, useState } from 'react';
import HTMLReactParser from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import { Modal } from '/imports/ui/core';
import { canCreateContentAtom } from '/imports/state';
import { call } from '/imports/api/_utils/shared';
import { hasContact } from '/imports/api/_utils/contact';
import BookableChip from '/imports/ui/generic/BookableChip';
import { ContactDetails } from '/imports/ui/generic/ContactDetails';
import BookingInfo from '/imports/ui/pages/resources/components/BookingInfo';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

import { RichText } from './EntryHero';

const Picture = styled('img', {
  borderRadius: '12px',
  display: 'block',
  marginBottom: '1.25rem',
  maxHeight: '260px',
  objectFit: 'cover',
  width: '100%',
});

const Section = styled('div', {
  marginTop: '1.5rem',
});

const SectionTitle = styled('h3', {
  color: 'var(--cocoso-tegel)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  margin: '0 0 0.75rem',
  textTransform: 'uppercase',
});

const EditLink = styled(Link, {
  color: 'var(--cocoso-colors-theme-800)',
  display: 'inline-block',
  fontWeight: 600,
  marginTop: '1.5rem',
});

// A place left out of the list of places (a room in the library, say)
// opens over the page of the place it is in, from ?part=<id>, instead of
// on a page of its own.
export default function PartModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const partId = searchParams.get('part');
  const [part, setPart] = useState<any>(null);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const prefix = useLocationPrefix();
  const [tc] = useTranslation('common');

  useEffect(() => {
    let current = true;
    setPart(null);
    if (partId) {
      call('getResourceById', partId)
        .then((resource: any) => current && setPart(resource))
        .catch(() => current && setPart(null));
    }
    return () => {
      current = false;
    };
  }, [partId]);

  const close = () =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete('part');
        return next;
      },
      { preventScrollReset: true }
    );

  if (!partId) {
    return null;
  }

  const picture = getImageUrl(part?.images?.[0], 'medium');

  return (
    <Modal
      hideFooter
      id="part-modal"
      open={Boolean(part)}
      size="lg"
      title={part?.label}
      onClose={close}
    >
      {part && (
        <>
          {picture && <Picture alt="" src={picture} />}
          <BookableChip place={part} />
          {part.description && (
            <RichText className="text-content" css={{ marginTop: '1rem' }}>
              {HTMLReactParser(DOMPurify.sanitize(part.description))}
            </RichText>
          )}
          {part.booking && (
            <Section>
              <SectionTitle>{tc('entry.booking')}</SectionTitle>
              <BookingInfo booking={part.booking} label={part.label} />
            </Section>
          )}
          {hasContact(part.contact) && (
            <Section>
              <SectionTitle>{tc('contact.title')}</SectionTitle>
              <ContactDetails contact={part.contact} />
            </Section>
          )}
          {/* It has no page to edit it from: the form opens on its own */}
          {canCreateContent && (
            <EditLink to={`${prefix}/resources/${part._id}?edit=true`}>
              {tc('actions.update')}
            </EditLink>
          )}
        </>
      )}
    </Modal>
  );
}
