import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import { Trans, useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

import {
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Tag,
} from '/imports/ui/core';

import NiceSlider from '../generic/NiceSlider';
import PlaceholderImage from '../generic/PlaceholderImage';
import Tabs from '../core/Tabs';
import BackLink, { BackLinkData } from './BackLink';
import { getImageUrl, getImageUrlBest } from '../utils/imageHelper';
import { publicUrl } from '/imports/api/_utils/shared';

interface Author {
  username: string;
  src?: string;
}

interface AvatarHolderProps {
  author: Author | null;
}

interface HeaderProps {
  author?: Author | null;
  backLink?: BackLinkData;
  dates?: React.ReactNode;
  subTitle?: string;
  tags?: string[] | null;
  title: string;
}

interface Tab {
  path: string;
  title: string;
  content: React.ReactNode;
}

interface TablyCenteredProps extends HeaderProps {
  action?: React.ReactNode;
  /** Shown full width below the tabs. */
  children?: React.ReactNode;
  content?: React.ReactNode;
  /**
   * Images to show under the header. An empty or undefined list draws a
   * placeholder; pass `null` to leave the image area out altogether.
   */
  images?: Array<string | undefined> | null;
  /** Stable id for the placeholder drawn when there are no images. */
  placeholderSeed?: string;
  tabs?: Tab[];
  url?: string;
}

const placeholderStyle: React.CSSProperties = {
  borderRadius: 'var(--cocoso-radius-kort)',
  boxShadow: 'var(--cocoso-skugga-kort)',
  height: '280px',
  maxWidth: '780px',
};

const AvatarHolder: React.FC<AvatarHolderProps> = ({ author }) => {
  if (!author) {
    return null;
  }
  return (
    <Box mt="2">
      <Link to={`/@${author.username}/`}>
        <Flex align="center" direction="column" justify="center" gap="0">
          <Avatar
            name={author.username}
            size="lg"
            src={getImageUrl(author.src, 'thumb')}
          />
          <span className="tably-author-name">{author.username}</span>
        </Flex>
      </Link>
    </Box>
  );
};

const Header: React.FC<HeaderProps> = ({
  author,
  backLink,
  dates,
  subTitle,
  tags,
  title,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = async (): Promise<void> => {
    const href = window.location.href;
    await navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const renderTitles = () => (
    <Center>
      <Flex
        p="4"
        justify={author ? 'space-between' : 'center'}
        w="100%"
        css={{ maxWidth: '720px' }}
      >
        <Box px="2">
          <Heading
            size="lg"
            css={{
              lineHeight: 1.08,
              margin: '0.5rem 0',
              textAlign: author ? 'left' : 'center',
              fontSize: '2.2rem',
            }}
          >
            {title}
          </Heading>
          {subTitle && (
            <Heading
              size="sm"
              css={{
                color: 'var(--cocoso-mylla-soft)',
                fontFamily: 'var(--cocoso-body-font-family)',
                fontSize: '1.1rem',
                fontWeight: 'normal',
                lineHeight: 1.3,
                margin: '0.5rem 0',
                textAlign: author ? 'left' : 'center',
              }}
            >
              {subTitle}
            </Heading>
          )}
          {tags && tags.length > 0 ? (
            <Flex justify={author ? 'flex-start' : 'center'} mt="2" wrap="wrap">
              {tags.map((tag, i) => (
                <Tag colorScheme="gray" key={tag + i}>
                  {tag}
                </Tag>
              ))}
            </Flex>
          ) : null}
          {dates ? <Center pt="2">{dates}</Center> : null}
        </Box>
        {author ? <AvatarHolder author={author} /> : null}
      </Flex>
    </Center>
  );

  return (
    <Box mb="4" w="100%">
      <Flex align="flex-start" justify="space-between">
        <Box pl="2" width="150px">
          {backLink && <BackLink backLink={backLink} />}
        </Box>

        <Button
          leftIcon={<LinkIcon />}
          size="lg"
          variant="ghost"
          css={{
            fontWeight: 'normal',
            marginRight: '1rem',
          }}
          onClick={() => handleCopyLink()}
        >
          {copied ? (
            <Trans i18nKey="actions.copied" ns="common">
              Link copied!
            </Trans>
          ) : (
            <Trans i18nKey="actions.share" ns="common">
              Share
            </Trans>
          )}
        </Button>
      </Flex>
      {renderTitles()}
    </Box>
  );
};

const TablyCentered: React.FC<TablyCenteredProps> = ({
  action = null,
  author = null,
  children,
  backLink,
  dates,
  content,
  images,
  placeholderSeed,
  subTitle,
  tabs,
  tags,
  title,
  url,
}) => {
  const [searchParams] = useSearchParams();
  const [tc] = useTranslation('common');

  const selectedTabValue = searchParams.get('tab');
  let tabIndex = tabs?.findIndex((tab) => tab.path === selectedTabValue);
  if (tabIndex === -1) tabIndex = 0;
  const selectedTab = tabs?.find((tab, index) => index === tabIndex);

  // What a shared link shows: the subtitle, else the site's own line.
  // (content is usually a React node, never a string to quote.)
  const description =
    subTitle ||
    (typeof content === 'string' ? content : '') ||
    tc('home.hero.tagline');
  const showImageArea = images !== null;
  const presentImages = images?.filter((img): img is string => Boolean(img));
  const hasImages = Boolean(presentImages && presentImages.length > 0);
  const imageUrl = getImageUrlBest(presentImages && presentImages[0]);

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="tags" content={tags?.join(',')} />
        <meta property="og:title" content={title?.substring(0, 40)} />
        <meta property="og:url" content={url} />
        <meta
          property="og:image"
          content={imageUrl || publicUrl('/images/og-default.jpg')}
        />
        <meta
          property="og:description"
          content={description?.substring(0, 150)}
        />
        <meta property="og:type" content="article" />
      </Helmet>

      <Center w="100%">
        <Box w="100%">
          <Box>
            <Header
              author={author}
              backLink={backLink}
              dates={dates}
              subTitle={subTitle}
              tags={tags}
              title={title}
            />

            {showImageArea &&
              (hasImages ? (
                <Center>
                  <NiceSlider alt={title} images={presentImages} />
                </Center>
              ) : (
                <Center px="4">
                  <PlaceholderImage
                    seed={placeholderSeed || url || title}
                    style={placeholderStyle}
                  />
                </Center>
              ))}

            {action && <Center>{action}</Center>}
          </Box>

          <Center mt="4" mb="8">
            <Box w="100%" css={{ maxWidth: '540px' }}>
              {tabs && (
                <Box mt="2">
                  <Tabs
                    justify="center"
                    index={tabIndex ?? 0}
                    tabs={tabs}
                    withSearchParams
                  />
                </Box>
              )}

              <Box
                css={{
                  marginBottom: '0.5rem',
                  wordBreak: 'break-word',
                  '@media (max-width: 480px)': { marginBottom: 0 },
                }}
              >
                {selectedTab?.content}
              </Box>
            </Box>
          </Center>

          {children}
        </Box>
      </Center>
    </>
  );
};

export default TablyCentered;
