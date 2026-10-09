import React from 'react';
import { Link } from 'react-router';

import { Box, Center, Heading, Text } from '/imports/ui/core';

export interface AuthPanelProps {
  title: string;
  // One line under the title; may hold a link
  lead?: React.ReactNode;
  children: React.ReactNode;
  // Links under the panel: "Logga in", "Registrera", …
  links?: { to: string; label: string }[];
}

// The account pages share one shape: a sheet of paper in the middle of the
// page with a Fraunces title, a line of context, the form, and the other
// account pages as links underneath. No modal over an empty page.
export default function AuthPanel({
  title,
  lead,
  children,
  links = [],
}: AuthPanelProps) {
  return (
    <Center px="4" py="8" css={{ minHeight: '60vh', alignItems: 'flex-start' }}>
      <Box w="100%" css={{ maxWidth: '440px' }}>
        <Box
          className="auth-panel"
          css={{
            background: 'var(--cocoso-papper)',
            borderRadius: 'var(--cocoso-radius-kort)',
            boxShadow: 'var(--cocoso-skugga-kort)',
            padding: '2rem 1.75rem 1.5rem',
            '@media (max-width: 480px)': { padding: '1.5rem 1.15rem 1.25rem' },
          }}
        >
          <Heading size="lg" textAlign="center" mb="2">
            {title}
          </Heading>
          {lead && (
            <Text
              textAlign="center"
              css={{ color: 'var(--cocoso-mylla-soft)', marginBottom: '1rem' }}
            >
              {lead}
            </Text>
          )}
          {children}
        </Box>

        {links.length > 0 && (
          <Center gap="6" mt="5" css={{ flexWrap: 'wrap' }}>
            {links.map((link) => (
              <Link key={link.to} className="auth-panel-link" to={link.to}>
                {link.label}
              </Link>
            ))}
          </Center>
        )}
      </Box>
    </Center>
  );
}
