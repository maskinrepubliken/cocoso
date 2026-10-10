import { Meteor } from 'meteor/meteor';
import React, { memo } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';

import {
  Avatar,
  Box,
  Center,
  Flex,
  Heading,
  Image,
  Text,
} from '/imports/ui/core';

import PlaceholderImage from '../generic/PlaceholderImage';
import PlaceTag from '../generic/PlaceTag';
import Tag from '../generic/Tag';
import {
  worldShapeColors,
  type LocationWorld,
} from '/imports/ui/utils/locationPalette';
import { getImageUrl } from '../utils/imageHelper';

const isClient = Meteor.isClient;

if (isClient) {
  import 'react-lazy-load-image-component/src/effects/black-and-white.css';
}

const imageStyle: React.CSSProperties = {
  margin: '0 auto',
  position: 'relative',
  width: '100%',
};

// Fills the picture area edge to edge when it has a set height
const coverStyle: React.CSSProperties = {
  display: 'block',
  height: '100%',
  objectFit: 'cover',
  width: '100%',
};

interface Avatar {
  name: string;
  url?: string;
}

export interface NewGridThumbProps {
  avatar?: Avatar;
  color?: string;
  coverText?: string;
  fixedImageHeight?: boolean;
  footer?: React.ReactNode;
  index?: number;
  imageUrl?: string | null;
  /** Stable id used to draw the placeholder when there is no image. */
  placeholderSeed?: string;
  subTitle?: string;
  title?: string;
  tag?: string;
  /** The place the item belongs to: colours its shapes and its tag. */
  placeName?: string | null;
  world?: LocationWorld;
}

function NewGridThumb({
  avatar,
  color,
  coverText,
  fixedImageHeight = false,
  footer = null,
  index,
  imageUrl,
  placeholderSeed,
  subTitle,
  title,
  tag,
  placeName,
  world,
}: NewGridThumbProps) {
  if (!title && !imageUrl) {
    return null;
  }

  return (
    <Box
      css={{
        backgroundColor: 'var(--cocoso-papper)',
        borderRadius: 'var(--cocoso-radius-kort)',
        boxShadow: 'var(--cocoso-skugga-kort)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          boxShadow: '0 18px 30px -14px rgba(60, 40, 20, 0.5)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Box
        className="text-link-container"
        css={{
          borderRadius: 'var(--cocoso-border-radius)',
        }}
      >
        <Center
          bg={imageUrl ? 'white' : 'theme.100'}
          css={{
            // A fixed height on wide screens, the card's own proportion on
            // phones where two cards share the width.
            height: fixedImageHeight ? '220px' : 'auto',
            overflow: 'hidden',
            position: 'relative',
            '@media (max-width: 599px)': fixedImageHeight
              ? { aspectRatio: '4 / 3', height: 'auto' }
              : {},
          }}
        >
          {imageUrl ? (
            index < 8 ? (
              <Image
                alt={title}
                loading="lazy"
                src={imageUrl}
                style={fixedImageHeight ? coverStyle : imageStyle}
              />
            ) : (
              <LazyLoadImage
                alt={title}
                effect="black-and-white"
                src={imageUrl}
                style={fixedImageHeight ? coverStyle : imageStyle}
                wrapperProps={{ style: fixedImageHeight ? coverStyle : undefined }}
              />
            )
          ) : (
            <>
              <PlaceholderImage
                seed={placeholderSeed || title}
                palette={world ? worldShapeColors(world) : undefined}
                background={world?.tint}
                style={{
                  height: fixedImageHeight ? '100%' : '180px',
                  left: 0,
                  position: fixedImageHeight ? 'absolute' : 'relative',
                  top: 0,
                }}
              />
              {coverText && (
                <Text
                  css={{
                    color: 'var(--cocoso-colors-theme-800)',
                    fontSize: '2rem',
                    fontWeight: 'light',
                    margin: '1rem',
                    position: 'absolute',
                    textShadow: '0 1px 2px rgba(255,255,255,0.6)',
                  }}
                >
                  {coverText}
                </Text>
              )}
            </>
          )}
        </Center>

        <Flex
          align="flex-start"
          justify="space-between"
          py="2"
          px="4"
          css={{ backgroundColor: 'var(--cocoso-papper)' }}
        >
          <Box pb="2" pr="3">
            <Heading
              className="text-link"
              truncated
              mb="1"
              mt="2"
              css={{
                fontSize: '1.25rem',
                overflowWrap: 'anywhere',
              }}
            >
              {title}
            </Heading>
            {subTitle && (
              <Heading
                className="text-link"
                truncated
                css={{
                  fontSize: '1rem',
                  fontWeight: 'light',
                  marginBottom: '0.5rem',
                  overflowWrap: 'anywhere',
                }}
              >
                {subTitle}
              </Heading>
            )}
            {placeName && <PlaceTag name={placeName} world={world} />}
            {tag && <Tag filterColor={color} label={tag} />}
          </Box>

          {avatar && (
            <Box pt="2">
              <Avatar
                name={avatar.name}
                size="md"
                src={getImageUrl(avatar.url, 'thumb')}
              />
            </Box>
          )}
        </Flex>
        {footer}
      </Box>
    </Box>
  );
}

export default memo(NewGridThumb);
