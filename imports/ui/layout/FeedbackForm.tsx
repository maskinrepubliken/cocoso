import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageCircleIcon from 'lucide-react/dist/esm/icons/message-circle';

import { call } from '/imports/api/_utils/shared';
import { Button, Input, Modal, Textarea } from '/imports/ui/core';
import ThreeDIcon, {
  type ThreeDIconName,
} from '/imports/ui/generic/ThreeDIcon';

// The three kinds, each with its picture
const SUBJECTS: { value: string; icon: ThreeDIconName }[] = [
  { value: 'suggestion', icon: 'bulb' },
  { value: 'bug', icon: 'tool' },
  { value: 'compliment', icon: 'heart' },
];

export interface FeedbackFormProps {
  isDarkText?: boolean;
  // Something else to open the form with than the default button
  trigger?: (open: () => void) => React.ReactNode;
}

// "Ge feedback": a short form in a modal, mailed to the site's admins
// (sendFeedback). The visitor stays on the page and is thanked in place.
export default function FeedbackForm({ trigger }: FeedbackFormProps) {
  const [tc] = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );

  // A fresh form each time it is opened after a sent one
  const openForm = () => {
    if (state === 'sent') {
      setMessage('');
      setState('idle');
    }
    setOpen(true);
  };

  const t = (key: string) => tc(`modals.feedback.form.${key}`);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    setState('sending');
    try {
      await call('sendFeedback', {
        subject,
        message,
        email: email.trim() || null,
        page: window.location.pathname,
        website: website || null,
      });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <>
      {trigger ? (
        trigger(openForm)
      ) : (
        <Button
          leftIcon={<MessageCircleIcon width={16} height={16} />}
          size="sm"
          variant="outline"
          onClick={openForm}
        >
          {tc('modals.feedback.label')}
        </Button>
      )}

      <Modal
        hideFooter
        id="feedback-form"
        open={open}
        title={state === 'sent' ? '' : tc('modals.feedback.label')}
        onClose={() => setOpen(false)}
      >
        {state === 'sent' ? (
          <div className="feedback-thanks" role="status">
            <ThreeDIcon name="heart" size={96} />
            <h3>{t('thanks.title')}</h3>
            <p>{t('thanks.text')}</p>
            <Button onClick={() => setOpen(false)}>{t('thanks.close')}</Button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={submit}>
            <p className="feedback-intro">{t('intro')}</p>

            <fieldset className="feedback-kinds">
              <legend>{t('subject.label')}</legend>
              {SUBJECTS.map((s) => (
                <label
                  key={s.value}
                  className={`feedback-kind${
                    subject === s.value ? ' is-chosen' : ''
                  }`}
                >
                  <input
                    checked={subject === s.value}
                    name="subject"
                    type="radio"
                    value={s.value}
                    onChange={() => setSubject(s.value)}
                  />
                  <ThreeDIcon name={s.icon} size={44} />
                  <span>{t(`subject.select.${s.value}`)}</span>
                </label>
              ))}
            </fieldset>

            <label className="feedback-field">
              <span>{t('details.label')}</span>
              <Textarea
                required
                maxLength={5000}
                name="message"
                placeholder={t(`details.placeholder.${subject}`)}
                rows={6}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMessage(e.target.value)
                }
              />
            </label>

            <label className="feedback-field">
              <span>
                {t('email.label')} <small>{t('email.hint')}</small>
              </span>
              <Input
                autoComplete="email"
                name="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />
            </label>

            {/* Never seen by people; a bot that fills it in is ignored */}
            <input
              aria-hidden="true"
              autoComplete="off"
              className="feedback-trap"
              name="website"
              tabIndex={-1}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            {state === 'error' && (
              <p className="feedback-error" role="alert">
                {t('error')}
              </p>
            )}

            <div className="feedback-actions">
              <small>{t('privacy')}</small>
              <Button
                disabled={!message.trim() || state === 'sending'}
                type="submit"
              >
                {state === 'sending' ? t('sending') : tc('actions.send')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
