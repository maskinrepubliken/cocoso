import React from 'react';
import { Link } from 'react-router';

export interface AuthPanelProps {
  title: string;
  // One line under the title; may hold a link or bold text
  lead?: React.ReactNode;
  // A lucide icon shown in a round badge above the title
  icon?: React.ReactNode;
  // Tints the badge: red for "this didn't work", orange for "take note"
  tone?: 'default' | 'error' | 'warning';
  children?: React.ReactNode;
  // Small print at the bottom of the sheet (terms, "didn't get it?")
  footer?: React.ReactNode;
  // Links under the panel; `quiet` ones are small and grey — there for
  // whoever looks for them
  links?: { to: string; label: string; quiet?: boolean }[];
}

// The account pages share one shape: a sheet of paper in the middle of the
// page with an optional icon, a Fraunces title, a line of context, the form,
// small print, and the other ways in as links underneath. No modal over an
// empty page. Styles: `.auth-*` in client/main.css.
export default function AuthPanel({
  title,
  lead,
  icon,
  tone = 'default',
  children,
  footer,
  links = [],
}: AuthPanelProps) {
  return (
    <div className="auth-page">
      <div className="auth-column">
        <section className="auth-panel" aria-labelledby="auth-panel-title">
          {icon && (
            <div className={`auth-badge auth-badge--${tone}`} aria-hidden>
              {icon}
            </div>
          )}
          <h1 className="auth-title" id="auth-panel-title">
            {title}
          </h1>
          {lead && <p className="auth-lead">{lead}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </section>

        {links.length > 0 && (
          <nav className="auth-links">
            {links.map((link) => (
              <Link
                key={link.to}
                className={`auth-panel-link${
                  link.quiet ? ' auth-panel-link--quiet' : ''
                }`}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
