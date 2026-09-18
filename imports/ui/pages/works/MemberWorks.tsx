import { Link, useLoaderData } from 'react-router';
import React from 'react';

import { Box } from '/imports/ui/core';
import Paginate from '/imports/ui/listing/Paginate';
import NewGridThumb from '/imports/ui/listing/NewGridThumb';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

export default function MemberWorks() {
  const { works } = useLoaderData();

  if (!works || works.length === 0) {
    return null;
  }

  return (
    <Paginate items={works}>
      {(work) => {
        return (
          <Box key={work._id}>
            <Link to={`/@${work.authorUsername}/works/${work._id}`}>
              <NewGridThumb
                avatar={{
                  name: work.authorUsername,
                  url: work.authorAvatar,
                }}
                imageUrl={getImageUrl(work.images?.[0], 'small')}
                tag={work.category?.label}
                title={work.title}
              />
            </Link>

          </Box>
        );
      }}
    </Paginate>
  );
}
