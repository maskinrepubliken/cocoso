import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import parseHtml from 'html-react-parser';
import { useTranslation } from 'react-i18next';

import { Box, Center, Flex, Heading, Modal, Tag } from '/imports/ui/core';

import ActionDates from '../entry/ActionDates';
import NiceSlider from '../generic/NiceSlider';

interface PopupHeaderProps {
  subTitle?: string;
  tags?: string[];
  title: string;
}

function PopupHeader({ subTitle, tags, title }: PopupHeaderProps) {
  const fontFamily = "'Raleway', sans-serif";

  const styles = {
    lineHeight: 1,
    textAlign: 'center',
    textShadow: '1px 1px 1px #fff',
    margin: '0.5rem',
  };

  return (
    <Box mb="4">
      <Heading
        as="h1"
        css={{
          ...styles,
          fontFamily,
          fontSize: '1.8rem',
        }}
      >
        {title}
      </Heading>
      {subTitle && (
        <Heading
          as="h2"
          css={{
            ...styles,
            fontSize: '1.3rem',
            fontWeight: '300',
          }}
        >
          {subTitle}
        </Heading>
      )}
      {tags && tags.length > 0 && (
        <Flex justify="center" pt="2">
          {tags.map(
            (tag) =>
              tag && (
                <Tag key={tag} colorScheme="gray" size="sm">
                  {tag}
                </Tag>
              )
          )}
        </Flex>
      )}
    </Box>
  );
}

interface PopupContentProps {
  action?: React.ReactNode;
  content?: React.ReactNode;
  images?: string[];
  subTitle?: string;
  title: string;
  tags?: string[];
}

function PopupContent({
  action = null,
  content,
  images,
  subTitle,
  title,
  tags,
}: PopupContentProps) {
  return (
    <Box css={{ overflowX: 'hidden' }}>
      <PopupHeader subTitle={subTitle} tags={tags} title={title} />
      <Center mb="4" mx="4" w="auto">
        {action}
      </Center>
      <Center mb="4">
        <NiceSlider alt={title} images={images} isPopup />
      </Center>

      <Box bg="white" className="text-content" p="4">
        {content}
      </Box>
    </Box>
  );
}

const getLinkPath = (item: any, kind: string) => {
  if (kind === 'works') {
    return `/@${item.authorUsername}/${kind}/${item._id}`;
  }
  return `/${kind}/${item._id}`;
};

export interface PopupHandlerProps {
  item: any;
  kind: string;
  showPast?: boolean;
  onClose: () => void;
}

export default function PopupHandler({
  item,
  kind,
  showPast,
  onClose,
}: PopupHandlerProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [tc] = useTranslation('common');

  const [displayedItem, setDisplayedItem] = useState(item);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (item) {
      if (lingerRef.current) clearTimeout(lingerRef.current);
      setDisplayedItem(item);
    } else {
      lingerRef.current = setTimeout(() => setDisplayedItem(null), 350);
    }
    return () => {
      if (lingerRef.current) clearTimeout(lingerRef.current);
    };
  }, [item]);

  const getButtonLabel = () => tc('actions.entryPage');

  const handleCopyLink = async () => {
    if (!displayedItem) return;
    const link = `${window.location.origin}${getLinkPath(displayedItem, kind)}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  const handleActionButtonClick = () => {
    if (!displayedItem) return;
    navigate(getLinkPath(displayedItem, kind));
  };

  const tags = [];
  if (displayedItem?.isPrivate) {
    tags.push(tc('labels.private'));
  }

  return (
    <Modal
      cancelText={copied ? tc('actions.copied') : tc('actions.share')}
      confirmText={getButtonLabel()}
      hideHeader
      id="popup-handler"
      open={Boolean(item)}
      size="xl"
      onConfirm={handleActionButtonClick}
      onClose={onClose}
      onSecondaryButtonClick={handleCopyLink}
    >
      {displayedItem && (
        <PopupContent
          action={
            <ActionDates
              activity={displayedItem}
              showPast={showPast}
              showTime
            />
          }
          content={
            (displayedItem.longDescription &&
              parseHtml(displayedItem.longDescription)) ||
            (displayedItem.description && parseHtml(displayedItem.description))
          }
          images={displayedItem.images || [displayedItem.imageUrl]}
          subTitle={
            displayedItem.subTitle ||
            displayedItem.readingMaterial ||
            displayedItem.shortDescription ||
            null
          }
          tags={tags}
          title={displayedItem.title || displayedItem.label}
        />
      )}
    </Modal>
  );
}
