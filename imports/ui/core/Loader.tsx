import React from 'react';

import { styled } from '/stitches.config';

interface LoaderProps {
  relative?: boolean;
  speed?: number; // Animation speed in seconds
}

// Simple animated loader bar
const StyledLoader = styled('div', {
  top: 0,
  left: 0,
  right: 0,
  height: '2px',
  zIndex: 1500,
  background:
    'linear-gradient(90deg, var(--cocoso-tegel), var(--cocoso-colors-theme-500), var(--cocoso-season-glod-a), var(--cocoso-tegel))',
  backgroundSize: '200% 100%',
});

const LoaderBar = ({ relative, speed, ...rest }: LoaderProps) => (
  <StyledLoader
    css={{
      position: relative ? 'relative' : 'fixed',
      animation: `rainbow-slide ${speed || 2}s linear infinite`,
    }}
    {...rest}
  />
);

const Loader: React.FC<LoaderProps> = ({
  relative = false,
  speed = 2,
  ...props
}) => {
  return <LoaderBar relative={relative} speed={speed} {...props} />;
};

export default Loader;
