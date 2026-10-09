import React from 'react';
import { styled } from '/stitches.config';

const badgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '999px',
  fontFamily: 'var(--cocoso-font-ui)',
  fontWeight: 600,
  lineHeight: 1.2,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  transition: 'background 0.2s, color 0.2s, border 0.2s',
};

const sizeStyles = {
  sm: { fontSize: '0.75rem', padding: '0.125rem 0.5rem' },
  md: { fontSize: '0.875rem', padding: '0.1875rem 0.75rem' },
  lg: { fontSize: '1rem', padding: '0.25rem 1rem' },
};

// Lingon for warnings and counters, forest green for the good, glass blue
// for information, sand for the neutral, tegel for what is near in time.
const colorSchemes = {
  red: {
    solid: { background: 'var(--cocoso-lingon)', color: 'white', border: 'none' },
    subtle: { background: 'var(--cocoso-lingon-100)', color: 'var(--cocoso-lingon)', border: 'none' },
    outline: {
      background: 'transparent',
      color: 'var(--cocoso-lingon)',
      border: '1px solid var(--cocoso-lingon)',
    },
  },
  green: {
    solid: { background: 'var(--cocoso-colors-theme-500)', color: 'white', border: 'none' },
    subtle: { background: 'var(--cocoso-colors-theme-100)', color: 'var(--cocoso-colors-theme-700)', border: 'none' },
    outline: {
      background: 'transparent',
      color: 'var(--cocoso-colors-theme-700)',
      border: '1px solid var(--cocoso-colors-theme-500)',
    },
  },
  blue: {
    solid: { background: '#3f6b7a', color: 'white', border: 'none' },
    subtle: { background: '#dbe8ef', color: '#2f5868', border: 'none' },
    outline: {
      background: 'transparent',
      color: '#2f5868',
      border: '1px solid #3f6b7a',
    },
  },
  gray: {
    solid: { background: '#8a7f6a', color: 'white', border: 'none' },
    subtle: { background: '#e9dcc4', color: '#5a4a2a', border: 'none' },
    outline: {
      background: 'transparent',
      color: '#5a4a2a',
      border: '1px solid #8a7f6a',
    },
  },
  tegel: {
    solid: { background: 'var(--cocoso-tegel)', color: 'white', border: 'none' },
    subtle: { background: 'var(--cocoso-tegel-100)', color: 'var(--cocoso-tegel-600)', border: 'none' },
    outline: {
      background: 'transparent',
      color: 'var(--cocoso-tegel-600)',
      border: '1px solid var(--cocoso-tegel)',
    },
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg';
  css?: React.CSSProperties;
  colorScheme?: keyof typeof colorSchemes;
  variant?: 'solid' | 'subtle' | 'outline';
  children?: React.ReactNode;
  ref?: any;
}

const StyledBadgeBase = styled('span', {});
const StyledBadge = (props: BadgeProps) => {
  const {
    colorScheme = 'gray',
    size = 'md',
    variant = 'solid',
    css,
    children,
    ...rest
  } = props;
  const colorSet = colorSchemes[colorScheme] || colorSchemes.red;

  return (
    <StyledBadgeBase
      css={{
        ...badgeBase,
        ...(sizeStyles[size] || sizeStyles.md),
        ...(colorSet[variant] || colorSet.solid),
        ...css,
      }}
      {...rest}
    >
      {children}
    </StyledBadgeBase>
  );
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, colorScheme, ...rest }, ref) => (
    <StyledBadge ref={ref} colorScheme={colorScheme} {...rest}>
      {children}
    </StyledBadge>
  )
);
Badge.displayName = 'Badge';

export const NotificationBadge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, ...rest }, ref) => (
    <StyledBadge
      ref={ref}
      css={{
        border: '2px solid white',
        borderRadius: '50%',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        height: '1.5rem',
        padding: '0.45rem',
        position: 'absolute',
        right: '-0.75rem',
        top: '-0.5rem',
        width: '1.5rem',
      }}
      {...rest}
    >
      {children}
    </StyledBadge>
  )
);

export default Badge;
