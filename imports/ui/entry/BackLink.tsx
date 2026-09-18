import { Link } from 'react-router';
import React from 'react';
import ChevronLeftIcon from 'lucide-react/dist/esm/icons/chevron-left';

import { Button } from '/imports/ui/core';
import { useLocationPrefix } from '/imports/ui/utils/useLocation';

export interface BackLinkData {
  label?: string;
  value: string;
}

export interface BackLinkProps {
  backLink?: BackLinkData | null;
}

export default function BackLink({ backLink }: BackLinkProps) {
  const prefix = useLocationPrefix();
  if (!backLink) {
    return null;
  }

  const link = `${prefix}${backLink.value}`;

  return (
    <Link to={link}>
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
