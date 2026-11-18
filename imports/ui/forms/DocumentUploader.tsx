import React, { useState } from 'react';
import { useRevalidator } from 'react-router';
import Dropzone from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { Heading, Modal, Spinner } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import DocumentsField from '/imports/ui/pages/resources/components/DocumentsField';
import {
  acceptedDocumentFormatsForUploads,
  maximumDocumentSizeForUploads,
} from '/imports/ui/utils/constants/general';

// A little line drawing of a page with a folded corner and a plus, the
// document counterpart of the picture uploader's framed landscape.
function DocumentArt() {
  return (
    <svg
      aria-hidden
      className="image-drop-art"
      fill="none"
      viewBox="0 0 48 40"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      <path d="M8 3h16l9 9v24a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M24 3v9h9" />
      <path d="M12 20h14M12 25h14M12 30h9" opacity=".55" />
      <circle cx="40" cy="8" fill="currentColor" r="7" stroke="none" />
      <path d="M40 5v6M37 8h6" stroke="var(--cocoso-papper)" />
    </svg>
  );
}

// Adding a document to a group, place or request: the same dashed drop
// row as for pictures in the forms, and below it the documents already
// there, with their previews and, for those who may, a bin.
export default function DocumentUploader({
  active,
  itemId,
  context,
  onClose,
}: {
  active: boolean;
  documents?: unknown;
  itemId?: string;
  context: string;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [tc] = useTranslation('common');
  const { revalidate } = useRevalidator();

  if (!itemId) {
    return null;
  }

  const handleFileDrop = async (files: File[]) => {
    if (files.length !== 1) {
      message.error(tc('plugins.fileDropper.single'));
      return;
    }

    setUploading(true);
    const file = files[0];
    const parsedName = file.name.replace(/\s+/g, '-').toLowerCase();

    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await call(
        'createDocument',
        { fileData, fileName: parsedName, contentType: file.type },
        itemId,
        context
      );
      revalidate();
      message.success(tc('documents.uploaded'));
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      hideFooter
      id="add-document"
      open={active}
      size="lg"
      title={tc('documents.add')}
      onClose={onClose}
    >
      <Dropzone
        disabled={uploading}
        multiple={false}
        onDrop={handleFileDrop}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps({
              className: `image-drop ${isDragActive ? 'is-over' : ''}`,
            })}
          >
            <input {...getInputProps()} />
            {uploading ? <Spinner /> : <DocumentArt />}
            <span className="image-drop-text">
              {uploading ? (
                <strong>{tc('documents.up')}…</strong>
              ) : (
                <>
                  <strong>{tc('documents.choose')}</strong>{' '}
                  {tc('documents.orDrop')}
                </>
              )}
              <span className="image-drop-formats">
                {acceptedDocumentFormatsForUploads
                  .map((format) => format.replace('.', '').toUpperCase())
                  .join(', ')}{' '}
                ·{' '}
                {tc('documents.sizeEach', {
                  size: maximumDocumentSizeForUploads,
                })}
              </span>
            </span>
          </div>
        )}
      </Dropzone>

      <Heading
        size="xs"
        css={{ margin: '1.75rem 0 0.75rem' }}
      >
        {tc('documents.labelExisting')}
      </Heading>
      <DocumentsField contextId={itemId} />
    </Modal>
  );
}
