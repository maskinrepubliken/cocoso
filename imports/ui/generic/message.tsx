import React from 'react';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import i18n from 'i18next';
import XIcon from 'lucide-react/dist/esm/icons/x';

export const timeOutTime = 5000;

// A popup that stays until the user closes it. Use it for anything the user
// must read and act on, such as why a form could not be saved: a popup that
// vanishes on its own is easily missed.
export const PERSISTENT = Infinity;

const FORM_ERROR = 'form-error';
export const dismissFormError = () => toast.dismiss(FORM_ERROR);

interface MessageOptions {
  // An id replaces the popup already shown with that id instead of stacking
  // a new one on top.
  id?: string;
}

export const message = {
  success: (
    text: string,
    duration: number = timeOutTime,
    options: MessageOptions = {}
  ) => toast.success(text, { duration, ...options }),
  error: (
    text: string,
    duration: number = timeOutTime,
    options: MessageOptions = {}
  ) => toast.error(text, { duration, ...options }),
  info: (
    text: string,
    duration: number = timeOutTime,
    options: MessageOptions = {}
  ) => toast(text, { duration, ...options }),
  // Why a form being edited cannot be saved. It stays until closed, or
  // until the form is saved or left, and a newer one replaces it.
  formError: (text: string) =>
    toast.error(text, { duration: PERSISTENT, id: FORM_ERROR }),
  dismiss: (id?: string) => toast.dismiss(id),
};

// The same pane of glass as the entry sheet. Set inline, as the popup
// library sets its own look inline and would win over a stylesheet.
const glassShadow =
  'inset 0 0 0 1px rgba(255, 255, 255, 0.6), 0 1px 2px rgba(30, 50, 25, 0.08), 0 16px 40px -12px rgba(30, 50, 25, 0.35)';

const toastStyle: React.CSSProperties = {
  maxWidth: 'min(440px, calc(100vw - 32px))',
  padding: '10px 8px 10px 14px',
  borderRadius: 'calc(var(--cocoso-radius-meny) + 2px)',
  background: 'color-mix(in srgb, var(--cocoso-papper) 86%, transparent)',
  backdropFilter: 'blur(24px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
  boxShadow: glassShadow,
  color: 'var(--cocoso-mylla)',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.95rem',
  fontWeight: 600,
  lineHeight: 1.4,
};

// Where the popups appear. Every popup can be closed by hand; persistent
// ones only that way.
export function MessageHost() {
  return (
    <Toaster
      containerStyle={{ zIndex: 999999 }}
      toastOptions={{
        className: 'cocoso-toast',
        style: toastStyle,
        success: {
          iconTheme: {
            primary: 'var(--cocoso-colors-theme-500)',
            secondary: '#fff',
          },
        },
        error: {
          // A lingon edge on the left
          style: {
            ...toastStyle,
            boxShadow: `inset 4px 0 0 var(--cocoso-lingon), ${glassShadow}`,
          },
          iconTheme: {
            primary: 'var(--cocoso-lingon)',
            secondary: '#fff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message: text }) => (
            <>
              {icon}
              <div className="cocoso-toast-text">{text}</div>
              {t.type !== 'loading' && (
                <button
                  type="button"
                  aria-label={i18n.t('common:actions.close')}
                  className="cocoso-toast-close"
                  onClick={() => toast.dismiss(t.id)}
                >
                  <XIcon aria-hidden width={16} height={16} />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
