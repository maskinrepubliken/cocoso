import React, { useEffect, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import FileIcon from 'lucide-react/dist/esm/icons/file';
import FileTextIcon from 'lucide-react/dist/esm/icons/file-text';
import TrashIcon from 'lucide-react/dist/esm/icons/trash-2';

import { styled } from '/stitches.config';
import { Button, Loader } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

interface DocumentItem {
  _id: string;
  documentLabel: string;
  documentUrl: string;
  contentType?: string;
  creationDate?: Date;
  // Worked out by the server for the one asking (document.methods.js)
  canRemove?: boolean;
}

const List = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const Row = styled('li', {
  alignItems: 'center',
  borderRadius: '12px',
  display: 'flex',
  gap: '0.85rem',
  padding: '0.4rem',
  transition: 'background-color 0.15s ease',
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
  variants: {
    asking: {
      true: {
        backgroundColor: 'var(--cocoso-colors-red-50)',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-red-50)' },
      },
    },
  },
});

// A small square: the picture itself, or the kind of file
const Preview = styled('a', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '8px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  fontSize: '0.62rem',
  fontWeight: 700,
  gap: '2px',
  height: '56px',
  justifyContent: 'center',
  letterSpacing: '0.04em',
  overflow: 'hidden',
  textDecoration: 'none',
  width: '56px',
  '& img': { height: '100%', objectFit: 'cover', width: '100%' },
  '& svg': { height: '1.4rem', width: '1.4rem' },
});

const Text = styled('div', {
  flex: '1 1 auto',
  minWidth: 0,
  '& a': {
    color: 'var(--cocoso-colors-theme-800)',
    display: 'block',
    fontWeight: 600,
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& a:hover': { textDecoration: 'underline' },
  '& small': { color: 'var(--cocoso-mylla-soft)', fontSize: '0.82rem' },
});

const RemoveButton = styled('button', {
  alignItems: 'center',
  background: 'none',
  border: 0,
  borderRadius: '999px',
  color: 'var(--cocoso-mylla-soft)',
  cursor: 'pointer',
  display: 'flex',
  flexShrink: 0,
  height: '2.25rem',
  justifyContent: 'center',
  width: '2.25rem',
  '& svg': { height: '1.1rem', width: '1.1rem' },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-red-50)',
    color: 'var(--cocoso-colors-red-700)',
  },
});

const Confirm = styled('div', {
  display: 'flex',
  flexShrink: 0,
  gap: '0.4rem',
});

// "PDF", "DOCX", … from the type, else from the file name
function kindOf(doc: DocumentItem): string {
  if (doc.contentType === 'application/pdf') return 'PDF';
  const ext = doc.documentLabel.split('.').pop();
  return ext && ext !== doc.documentLabel ? ext.toUpperCase().slice(0, 4) : '';
}

const isImage = (doc: DocumentItem) =>
  Boolean(doc.contentType?.startsWith('image/')) ||
  /\.(png|jpe?g|gif|webp|avif)$/i.test(doc.documentLabel);

// The documents of a place or request as a list: a small preview of each,
// its name opening it in a new tab, when it was added, and a bin for those
// who may remove it, asking once more before it goes.
export default function DocumentsField({
  contextId,
}: {
  contextType?: string;
  contextId: string;
}) {
  const [tc] = useTranslation('common');
  const { revalidate } = useRevalidator();
  // The page's own copy: when an upload or a removal reloads it, fetch too
  const loaded = (useLoaderData() as any)?.documents;
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const getDocuments = async () => {
    if (!contextId) return;
    try {
      setDocuments(await call('getDocumentsByAttachments', contextId));
    } catch (error: any) {
      message.error(error.reason || error.error);
      setDocuments([]);
    }
  };

  useEffect(() => {
    getDocuments();
  }, [contextId, loaded]);

  const remove = async (documentId: string) => {
    setRemoving(true);
    try {
      await call('removeDocument', documentId);
      message.success(tc('documents.remove'));
      setAsking(null);
      await getDocuments();
      revalidate();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setRemoving(false);
    }
  };

  if (!documents) {
    return <Loader relative />;
  }
  if (documents.length === 0) {
    return <small>{tc('documents.empty')}</small>;
  }

  return (
    <List>
      {documents.map((doc) => (
        <Row key={doc._id} asking={asking === doc._id}>
          <Preview
            aria-hidden
            href={doc.documentUrl}
            rel="noreferrer"
            tabIndex={-1}
            target="_blank"
          >
            {isImage(doc) ? (
              <img alt="" loading="lazy" src={doc.documentUrl} />
            ) : (
              <>
                {kindOf(doc) === 'PDF' ? <FileTextIcon /> : <FileIcon />}
                {kindOf(doc)}
              </>
            )}
          </Preview>
          <Text>
            <a href={doc.documentUrl} rel="noreferrer" target="_blank">
              {doc.documentLabel}
            </a>
            <small>
              {[
                kindOf(doc),
                doc.creationDate && dayjs(doc.creationDate).format('D MMM YYYY'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </Text>
          {doc.canRemove &&
            (asking === doc._id ? (
              <Confirm>
                <Button
                  colorScheme="red"
                  loading={removing}
                  size="sm"
                  onClick={() => remove(doc._id)}
                >
                  {tc('actions.remove')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAsking(null)}
                >
                  {tc('actions.cancel')}
                </Button>
              </Confirm>
            ) : (
              <RemoveButton
                aria-label={`${tc('actions.remove')}: ${doc.documentLabel}`}
                title={tc('actions.remove')}
                type="button"
                onClick={() => setAsking(doc._id)}
              >
                <TrashIcon aria-hidden />
              </RemoveButton>
            ))}
        </Row>
      ))}
    </List>
  );
}
