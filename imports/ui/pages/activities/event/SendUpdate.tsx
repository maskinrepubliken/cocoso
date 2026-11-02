import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styled } from '/stitches.config';
import { Button, Modal, Textarea } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

import { Muted } from './Section';

const Box = styled('div', {
  borderTop: '1px solid var(--cocoso-colors-theme-100)',
  marginTop: '1.25rem',
  paddingTop: '1rem',
});

const Title = styled('h3', {
  fontSize: '1rem',
  fontWeight: 700,
  margin: '0 0 0.35rem',
});

const Row = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1rem',
  justifyContent: 'space-between',
  marginTop: '0.5rem',
});

const MAX = 2000;

// In the organizer's tools: a message to everyone signed up for the event
// and everyone following it, by email and push (sendActivityMessage).
export default function SendUpdate({ activityId }: { activityId: string }) {
  const [tc] = useTranslation('common');
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const loadAudience = () =>
    call('getActivityAudience', activityId)
      .then((count) => setAudience(count as number))
      .catch(() => setAudience(null));

  useEffect(() => {
    loadAudience();
  }, [activityId]);

  const send = async () => {
    setSending(true);
    try {
      const result = (await call('sendActivityMessage', activityId, text)) as {
        recipients: number;
      };
      message.success(
        tc('event.message.sent', { count: result.recipients || 0 })
      );
      setText('');
      setIsConfirming(false);
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Title>{tc('event.message.title')}</Title>
      <Muted css={{ marginBottom: '0.5rem' }}>
        {tc('event.message.intro')}
      </Muted>
      <Textarea
        maxLength={MAX}
        placeholder={tc('event.message.placeholder')}
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Row>
        <Muted>
          {audience !== null &&
            tc('event.message.audience', { count: audience })}
        </Muted>
        <Button
          disabled={!text.trim() || sending || audience === 0}
          size="sm"
          onClick={() => setIsConfirming(true)}
        >
          {tc('event.message.send')}
        </Button>
      </Row>
      <Muted css={{ marginTop: '0.5rem' }}>
        {tc('event.message.automatic')}
      </Muted>

      <Modal
        confirmButtonProps={{ isLoading: sending, isDisabled: sending }}
        confirmText={tc('event.message.send')}
        id="event-send-update-confirm"
        open={isConfirming}
        title={tc('event.message.title')}
        onClose={() => setIsConfirming(false)}
        onConfirm={send}
      >
        <p>{tc('event.message.confirm')}</p>
        <p style={{ whiteSpace: 'pre-line', fontStyle: 'italic' }}>{text}</p>
      </Modal>
    </Box>
  );
}
