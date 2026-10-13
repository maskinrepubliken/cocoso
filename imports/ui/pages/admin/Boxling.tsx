import React, { ReactNode, CSSProperties } from 'react';

import { Box, Flex, Text } from '/imports/ui/core';

interface BoxlingProps {
  children: ReactNode;
  css?: CSSProperties;
  noHoverEffect?: boolean;
  [key: string]: any;
}

export function BoxlingColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Flex align="center" direction="column" gap="1">
      <Text fontWeight="bold" size="sm">
        {title}
      </Text>
      <Box style={{ marginBottom: '1rem' }} />
      {children}
    </Flex>
  );
}

const Boxling: React.FC<BoxlingProps> = ({
  children,
  css,
  noHoverEffect = true,
  ...rest
}) => {
  return (
    <Box
      p="6"
      css={{
        backgroundColor: 'var(--cocoso-papper)',
        borderRadius: 'var(--cocoso-radius-kort)',
        boxShadow: 'var(--cocoso-skugga)',
        ...(!noHoverEffect && {
          '&:hover': {
            backgroundColor: 'white',
          },
        }),
        ...css,
      }}
      w="100%"
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Boxling;
