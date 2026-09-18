import { Link, useLoaderData } from 'react-router';
import React from 'react';

import { Box } from '/imports/ui/core';
import Paginate from '/imports/ui/listing/Paginate';
import NewGridThumb from '/imports/ui/listing/NewGridThumb';

function MemberGroups() {
  const { groups } = useLoaderData();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paginate items={groups}>
      {(group) => {
        return (
          <Box key={group._id}>
            <Link to={`/groups/${group._id}`}>
              <NewGridThumb
                imageUrl={group.imageUrl}
                subTitle={group.readingMaterial}
                title={group.title}
              />
            </Link>

          </Box>
        );
      }}
    </Paginate>
  );
}

export default MemberGroups;
