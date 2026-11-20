import React from 'react';
import { useTranslation } from 'react-i18next';

import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

// "Beta – the service is new and still being built": a glass pill with a
// 3D flask tipping out of its left end. In the start page's hero and at the
// top of the help pages.
export default function BetaNotice({ className = '' }: { className?: string }) {
  const [tc] = useTranslation('common');

  return (
    <p className={`home-hero-beta ${className}`.trim()}>
      <span className="home-hero-beta-icon" aria-hidden="true">
        <ThreeDIcon name="lab" size={46} />
      </span>
      <span>
        <strong>{tc('home.hero.beta')}</strong>
        {tc('home.hero.betaNote')}
      </span>
    </p>
  );
}
