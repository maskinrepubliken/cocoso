import React, { ReactNode } from 'react';
import { styled } from '/stitches.config';

import { Flex } from './Box';
import { xToRem } from './functions';

// Button
interface ButtonProps {
  as?: string;
  children?: any;
  color?: string;
  colorScheme?: string;
  disabled?: boolean;
  isDisabled?: boolean; // backwards compatibility
  leftIcon?: ReactNode;
  loading?: boolean;
  isLoading?: boolean; // backwards compatibility
  mx?: string | number;
  ml?: string | number;
  mr?: string | number;
  mt?: string | number;
  mb?: string | number;
  my?: string | number;
  m?: string | number;
  rightIcon?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  variant?: 'solid' | 'ghost' | 'outline';
  onClick?: () => void;
  css?: any;
  style?: any;
}

// "Hemma i Tranemo": every button is a pill. Solid is the green of the
// municipality, outline is paper with a hairline, ghost is text only. The
// 'tegel' colour scheme is the warm accent, for at most one action per view.
const ButtonComponentStyled = styled('button', {
  borderRadius: '999px',
  borderStyle: 'solid',
  fontFamily: 'var(--cocoso-font-ui)',
  fontWeight: 700,
  lineHeight: 1.2,
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
  '&:focus-visible': {
    outline: '2px solid var(--cocoso-colors-theme-500)',
    outlineOffset: '2px',
  },
  '&:active:not(:disabled)': { transform: 'translateY(1px)' },
});

const ButtonComponent = (props: ButtonProps) => {
  const {
    children,
    colorScheme = 'theme',
    disabled: disabledProp,
    isDisabled,
    size = 'md',
    variant = 'solid',
    css,
    ...rest
  } = props;
  const disabled = disabledProp || isDisabled;

  // Color variables
  const isTegel = colorScheme === 'tegel';
  const isLingon = colorScheme === 'red' || colorScheme === 'lingon';
  const main = isTegel
    ? 'var(--cocoso-tegel)'
    : isLingon
    ? 'var(--cocoso-lingon)'
    : `var(--cocoso-colors-${colorScheme}-500)`;
  const mainHover = isTegel
    ? 'var(--cocoso-tegel-600)'
    : isLingon
    ? '#8e2a31'
    : `var(--cocoso-colors-${colorScheme}-600)`;
  const ink = isTegel
    ? 'var(--cocoso-tegel-600)'
    : isLingon
    ? 'var(--cocoso-lingon)'
    : `var(--cocoso-colors-${colorScheme}-700)`;
  const soft = isTegel
    ? 'var(--cocoso-tegel-100)'
    : isLingon
    ? 'var(--cocoso-lingon-100)'
    : `var(--cocoso-colors-${colorScheme}-100)`;
  const bg =
    variant === 'ghost'
      ? 'transparent'
      : variant === 'outline'
      ? 'var(--cocoso-papper)'
      : main;
  const border =
    variant === 'outline' ? props.color || 'var(--cocoso-linje)' : 'transparent';
  const textColor = variant === 'solid' ? 'white' : ink;
  const hoverBg = variant === 'solid' ? mainHover : soft;
  const focusBg = hoverBg;

  return (
    <ButtonComponentStyled
      disabled={disabled}
      css={{
        backgroundColor: bg,
        borderWidth: variant === 'outline' ? '1.5px' : '0',
        borderColor: border,
        boxShadow: variant === 'solid' ? 'var(--cocoso-skugga)' : 'none',
        color: textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize:
          size === 'xs'
            ? '0.75rem'
            : size === 'sm'
            ? '0.875rem'
            : size === 'lg'
            ? '1.1rem'
            : '1rem',
        marginInline: xToRem(props.mx),
        marginInlineStart: xToRem(props.ml),
        marginInlineEnd: xToRem(props.mr),
        marginTop: xToRem(props.mt || props.my),
        marginBottom: xToRem(props.mb || props.my),
        margin: xToRem(props.m),
        opacity: disabled ? 0.6 : 1,
        paddingInline:
          size === 'xs'
            ? '0.75rem'
            : size === 'sm'
            ? '0.9rem'
            : size === 'lg'
            ? '1.4rem'
            : '1.15rem',
        paddingTop:
          size === 'xs'
            ? '0.35rem'
            : size === 'sm'
            ? '0.45rem'
            : size === 'lg'
            ? '0.75rem'
            : '0.6rem',
        paddingBottom:
          size === 'xs'
            ? '0.35rem'
            : size === 'sm'
            ? '0.45rem'
            : size === 'lg'
            ? '0.75rem'
            : '0.6rem',
        pointerEvents: disabled ? 'none' : 'auto',
        '&:hover': {
          backgroundColor: disabled ? undefined : hoverBg,
          boxShadow:
            variant === 'solid' && !disabled
              ? '0 6px 14px -8px rgba(30, 50, 25, 0.5)'
              : undefined,
        },
        '&:focus': {
          backgroundColor: disabled ? undefined : focusBg,
        },
        ...css,
      }}
      {...rest}
    >
      {children}
    </ButtonComponentStyled>
  );
};

export const Button = ({
  disabled,
  isDisabled,
  isLoading,
  loading,
  leftIcon,
  rightIcon,
  children,
  onClick,
  ...rest
}: ButtonProps) => {
  const itsLoading = loading || isLoading;
  const itsDisabled = disabled || isDisabled || itsLoading;

  return (
    <ButtonComponent
      disabled={itsDisabled}
      onClick={isDisabled ? undefined : onClick}
      {...rest}
    >
      <Flex align="center" justify="center" gap="1">
        {itsLoading && (
          <div
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid currentColor',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '0.25rem',
            }}
          />
        )}
        {!itsLoading && leftIcon ? leftIcon : null}
        {children}
        {!loading && rightIcon ? rightIcon : null}
      </Flex>
    </ButtonComponent>
  );
};

interface IconButtonProps
  extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: ReactNode;
  'aria-label': string;
  colorScheme?: string;
  style?: React.CSSProperties;
}

export const IconButton = (props: IconButtonProps) => {
  const {
    icon,
    'aria-label': ariaLabel,
    disabled: disabledProp,
    colorScheme = 'theme',
    isDisabled,
    loading: loadingProp,
    isLoading,
    size = 'md',
    variant = 'ghost',
    ...rest
  } = props;

  const disabled = disabledProp || isDisabled;
  const loading = loadingProp || isLoading;
  const isDisabledFinal = disabled || loading;

  return (
    <ButtonComponent
      size={size}
      variant={variant}
      aria-label={ariaLabel}
      colorScheme={colorScheme}
      disabled={isDisabledFinal}
      onClick={isDisabledFinal ? undefined : props.onClick}
      style={{
        padding:
          size === 'xs'
            ? '0.25rem'
            : size === 'sm'
            ? '0.35rem'
            : size === 'lg'
            ? '0.65rem'
            : '0.5rem',
        width:
          size === 'xs'
            ? '2rem'
            : size === 'sm'
            ? '2.25rem'
            : size === 'lg'
            ? '2.75rem'
            : '2.5rem',
        height:
          size === 'xs'
            ? '2rem'
            : size === 'sm'
            ? '2.25rem'
            : size === 'lg'
            ? '2.75rem'
            : '2.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...rest.style,
      }}
      {...rest}
    >
      {loading ? (
        <div
          style={{
            width: '1rem',
            height: '1rem',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : (
        icon
      )}
    </ButtonComponent>
  );
};
