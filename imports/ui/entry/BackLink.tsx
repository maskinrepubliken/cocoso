import { Link } from 'react-router';
import React from 'react';
import ChevronLeftIcon from 'lucide-react/dist/esm/icons/chevron-left';

import { Button } from '/imports/ui/core';

export interface BackLinkData {
  label?: string;
  value: string;
}

export interface BackLinkProps {
  backLink?: BackLinkData | null;
}

export default function BackLink({ backLink }: BackLinkProps) {
  if (!backLink) {
    return null;
  }

  return (
    <Link to={backLink.value}>
      <Button
        leftIcon={<ChevronLeftIcon fontSize={18} />}
        size="lg"
        variant="ghost"
        css={{
          fontWeight: 'normal',
        }}
      >
        {backLink?.label}
      </Button>
    </Link>
  );
}
