import React from 'react';
import { styled } from '/stitches.config';
import AlertIcon from 'lucide-react/dist/esm/icons/alert-circle';
import InfoIcon from 'lucide-react/dist/esm/icons/info';
import WarningIcon from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckIcon from 'lucide-react/dist/esm/icons/check';

import { Box, Flex } from './Box';

type AlertType = 'info' | 'warning' | 'success' | 'error';

const icons: Record<AlertType, typeof InfoIcon> = {
  info: InfoIcon,
  warning: WarningIcon,
  success: CheckIcon,
  error: AlertIcon,
};

const AlertTitle = styled('h3', {
  color: 'var(--cocoso-mylla)',
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '0.5rem',
});

const AlertDescription = styled('div', {
  fontSize: '1rem',
  fontWeight: 600,
});

// A pane of glass tinted with the alert's tone; the look is .cocoso-notice
// in client/main.css, shared with the popups.
const AlertContainer = styled('div', {
  borderRadius: 'var(--cocoso-radius-meny)',
  fontFamily: 'var(--cocoso-font-ui)',
  padding: '14px 16px',
});

interface AlertProps {
  message?: string | React.ReactNode;
  title?: string | React.ReactNode;
  type?: AlertType;
  children?: React.ReactNode;
}

export default function Alert({
  message,
  title,
  type = 'info',
  children,
  ...props
}: AlertProps) {
  const Icon = icons[type];

  return (
    <AlertContainer
      className="cocoso-notice"
      data-tone={type}
      role={type === 'error' ? 'alert' : 'status'}
      {...props}
    >
      <Flex css={{ alignItems: 'flex-start' }}>
        <Box mr="2" css={{ flexShrink: 0, flexGrow: 0, display: 'flex' }}>
          <Icon aria-hidden color="var(--notice-tone)" />
        </Box>
        <Box css={{ alignSelf: 'center' }}>
          {title && <AlertTitle>{title}</AlertTitle>}
          {(message || children) && (
            <AlertDescription>{message || children}</AlertDescription>
          )}
        </Box>
      </Flex>
    </AlertContainer>
  );
}
