import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dropzone from 'react-dropzone';
import XIcon from 'lucide-react/dist/esm/icons/x';
import MoveIcon from 'lucide-react/dist/esm/icons/move';
import SortableList, { SortableItem } from 'react-easy-sort';
import { arrayMoveImmutable } from 'array-move';
import toast from 'react-hot-toast';

import { Center } from '/imports/ui/core';
import {
  acceptedImageFormatsForUploads,
  maximumDocumentSizeForUploads,
} from '/imports/ui/utils/constants/general';

import FileDropper from './FileDropper';
import {
  resizeBeforeUpload,
  uploadImage,
} from '../../api/_utils/services/clientUpload';
import DocumentUploadHelper from './UploadHelpers';
import { message } from '../generic/message';

// A little line drawing of a framed landscape, sun and hills, with a plus:
// pictures to come.
function PictureArt() {
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
      <rect height="28" rx="4" width="36" x="2" y="6" />
      <circle cx="13" cy="15" r="3" />
      <path d="M3 30l9-9 6 6 6-8 13 13" />
      <path d="M3 34h34" opacity=".35" />
      <circle cx="40" cy="8" fill="currentColor" r="7" stroke="none" />
      <path d="M40 5v6M37 8h6" stroke="var(--cocoso-papper)" />
    </svg>
  );
}

const acceptImages = {
  'image/*': acceptedImageFormatsForUploads,
};

// Where pictures are dropped or chosen: a tile in the grid once there are
// some, a slim dashed row before.
function ImageDrop({
  onFiles,
  compact,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const [tc] = useTranslation('common');
  return (
    <Dropzone accept={acceptImages} multiple onDrop={onFiles}>
      {({ getRootProps, getInputProps, isDragActive }) => (
        <div
          {...getRootProps({
            className: `image-drop ${compact ? 'is-tile' : ''} ${
              isDragActive ? 'is-over' : ''
            }`,
          })}
        >
          <input {...getInputProps()} />
          <PictureArt />
          {compact ? (
            <span className="image-drop-text">{tc('plugins.images.add')}</span>
          ) : (
            <span className="image-drop-text">
              <strong>{tc('plugins.images.choose')}</strong>{' '}
              {tc('plugins.images.orDrop')}
              <span className="image-drop-formats">
                {acceptedImageFormatsForUploads
                  .map((format) => format.replace('.', '').toUpperCase())
                  .join(', ')}{' '}
                ·{' '}
                {tc('plugins.images.maxSize', {
                  size: maximumDocumentSizeForUploads,
                })}
              </span>
            </span>
          )}
        </div>
      )}
    </Dropzone>
  );
}

export interface ImageUploaderProps {
  preExistingImages?: string[];
  isMultiple?: boolean;
  ping?: boolean;
  uploadParam?: 'entry' | 'avatar' | 'logo';
  onUploadedImages: (images: string[]) => void;
}

export default function ImageUploader({
  preExistingImages = [],
  isMultiple = true,
  ping = false,
  uploadParam = 'entry',
  onUploadedImages,
}: ImageUploaderProps) {
  const [tc] = useTranslation('common');
  const [localImages, setLocalImages] = useState(
    preExistingImages
      ? preExistingImages.map((image) => ({
          src: image,
          uploaded: true,
        }))
      : []
  );

  const uploadImages = async () => {
    try {
      const imagesReadyToSave = await Promise.all(
        localImages.map(async (uploadableImage) => {
          if (uploadableImage.uploaded) {
            return uploadableImage.src;
          }
          // Client-side resize as first pass for large files
          const resizedImage = await resizeBeforeUpload(
            uploadableImage.resizableData,
            1600
          );
          // Upload through server: Sharp → WebP variants → local storage
          const result = await uploadImage(resizedImage!, uploadParam);
          // Return the actual stored image URL instead of the Images collection _id.
          return result.variants.full;
        })
      );
      onUploadedImages(imagesReadyToSave);
    } catch (error: any) {
      toast.dismissAll();
      message.error(error.reason || error.error);
    }
  };

  useEffect(() => {
    if (ping) {
      uploadImages();
    }
  }, [ping]);

  const setUploadableImages = (files: File[]) => {
    if (!isMultiple) {
      const file = files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.addEventListener(
        'load',
        () => {
          setLocalImages([
            {
              src: reader.result,
              resizableData: file,
              uploaded: false,
            },
          ]);
        },
        false
      );
      return;
    }

    files.forEach((uploadableImage) => {
      const reader = new FileReader();
      reader.readAsDataURL(uploadableImage);
      reader.addEventListener(
        'load',
        () => {
          setLocalImages((prevLocalImages) => [
            ...prevLocalImages,
            {
              src: reader.result,
              resizableData: uploadableImage,
              uploaded: false,
            },
          ]);
        },
        false
      );
    });
  };

  const handleRemoveImage = (imageIndex) => {
    setLocalImages((prevLocalImages) =>
      prevLocalImages.filter((image, index) => index !== imageIndex)
    );
  };

  const handleSortImages = (oldIndex, newIndex) => {
    if (oldIndex === newIndex) {
      return;
    }

    setLocalImages((prevLocalImages) =>
      arrayMoveImmutable(prevLocalImages, oldIndex, newIndex)
    );
  };

  // One picture (an avatar, a logo): the dropper shows it
  if (!isMultiple && localImages.length === 0) {
    return (
      <>
        <Center>
          <FileDropper
            setUploadableImage={setUploadableImages}
            isMultiple={false}
          />
        </Center>
        <DocumentUploadHelper />
      </>
    );
  }

  if (!isMultiple) {
    return (
      <>
        <Center>
          <FileDropper
            imageUrl={localImages?.length > 0 ? localImages[0].src : null}
            setUploadableImage={setUploadableImages}
            isMultiple={false}
          />
        </Center>
        <DocumentUploadHelper />
      </>
    );
  }

  if (localImages.length === 0) {
    return <ImageDrop onFiles={setUploadableImages} />;
  }

  // The pictures in the order they are shown, the first as the main one;
  // dragged to reorder, with a tile to add more at the end.
  return (
    <div className="image-uploader">
      <SortableList
        className="image-grid"
        draggedItemClassName="image-thumb--dragged"
        onSortEnd={handleSortImages}
      >
        {localImages.map((image, index) => (
          <SortableItem key={String(image.src)}>
            <div
              className="image-thumb"
              style={{ backgroundImage: `url('${image.src}')` }}
            >
              <span className="image-thumb-badge">
                {index === 0 ? tc('plugins.images.main') : index + 1}
              </span>
              <button
                type="button"
                className="image-thumb-remove"
                aria-label={tc('plugins.images.remove', { n: index + 1 })}
                onClick={() => handleRemoveImage(index)}
              >
                <XIcon aria-hidden width={14} height={14} />
              </button>
            </div>
          </SortableItem>
        ))}
        <ImageDrop compact onFiles={setUploadableImages} />
      </SortableList>
      {localImages.length > 1 && (
        <p className="image-uploader-hint">
          <MoveIcon aria-hidden width={14} height={14} />
          {tc('plugins.images.reorder')}
        </p>
      )}
    </div>
  );
}
