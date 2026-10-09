import { getSeason, type Season } from '/imports/api/_utils/season';

// Helper for hue-based colors
const getColor = (hue: number, lightness: string, saturation: number = 80) =>
  `hsl(${hue}deg, ${saturation}%, ${lightness}%)`;

// "Hemma i Tranemo": the materials that do not come from the admin's hue.
// Paper for islands, mylla for text, tegel as the warm accent for what is
// near in time, lingon only for errors and counters. See docs/design.
const MATERIALS = `
      --cocoso-papper: #fffdf7;
      --cocoso-mylla: #22302a;
      --cocoso-mylla-soft: #5c6b60;
      --cocoso-linje: #d5dfc2;
      --cocoso-tegel: #c8613a;
      --cocoso-tegel-600: #a84e2d;
      --cocoso-tegel-100: #f6dfd2;
      --cocoso-lingon: #a8323a;
      --cocoso-lingon-100: #f5dcdc;
      --cocoso-skugga: 0 1px 2px rgba(60, 40, 20, 0.06), 0 6px 18px -14px rgba(60, 40, 20, 0.35);
      --cocoso-skugga-kort: 0 8px 22px -14px rgba(60, 40, 20, 0.45);
      --cocoso-skugga-meny: 0 12px 32px rgba(40, 30, 20, 0.16);
      --cocoso-font-display: Fraunces, Georgia, 'Times New Roman', serif;
      --cocoso-font-ui: Raleway, 'Helvetica Neue', Arial, sans-serif;
      --cocoso-radius-kort: 12px;
      --cocoso-radius-falt: 10px;
      --cocoso-radius-meny: 14px;
`;

// Four seasons: the floor's tone, the two glows in the hero and the notice
// board, and the accent (one step darker in winter so it holds against the
// cold floor). Everything else stays the same across the year.
const SEASON_VARS: Record<Season, string> = {
  var: `
      --cocoso-season-golv: #e9f3dc;
      --cocoso-season-glod-a: #b9dba0;
      --cocoso-season-glod-b: #f2e6b8;
      --cocoso-season-tavla: #cfe4b4;
      --cocoso-season-accent: #c8613a;`,
  sommar: `
      --cocoso-season-golv: #edf3df;
      --cocoso-season-glod-a: #f1dc8a;
      --cocoso-season-glod-b: #b9dba0;
      --cocoso-season-tavla: #cfe4b4;
      --cocoso-season-accent: #c8613a;`,
  host: `
      --cocoso-season-golv: #eeeedb;
      --cocoso-season-glod-a: #d9c79a;
      --cocoso-season-glod-b: #d8bfa9;
      --cocoso-season-tavla: #d9c79a;
      --cocoso-season-accent: #c8613a;`,
  vinter: `
      --cocoso-season-golv: #eceee7;
      --cocoso-season-glod-a: #cfe0ea;
      --cocoso-season-glod-b: #cdc3b4;
      --cocoso-season-tavla: #cfe0ea;
      --cocoso-season-accent: #b9603f;`,
};

/**
 * Create a CSS string for the given theme.
 * Shared between SSR + client.
 */
export const getGlobalStyles = (
  theme: any,
  season: Season = getSeason()
): string => {
  const hue = theme?.hue || 220;
  // The light shades (50–400) use `hue`; the dark ones (500–900), used for
  // text, buttons and details, can have a hue of their own.
  const saturation = Number(theme?.saturation) || 80;
  const accentHue = theme?.accentHue || hue;
  const accentSaturation = Number(theme?.accentSaturation) || saturation;
  const variant = theme?.variant;
  const isGray = variant === 'gray';
  const bodyFontDefinition = `${
    theme?.body?.fontFamily?.replace(/\+/g, ' ') || 'Raleway'
  }, sans-serif`;

  return `
    :root {
      --cocoso-colors-theme-: white;
      --cocoso-colors-theme-50: ${
        isGray ? 'rgb(250, 247, 245)' : getColor(hue, '97', saturation)
      };
      --cocoso-colors-theme-100: ${
        isGray ? 'rgb(240, 235, 230)' : getColor(hue, '92', saturation)
      };
      --cocoso-colors-theme-200: ${
        isGray ? 'rgb(228, 222, 218)' : getColor(hue, '85', saturation)
      };
      --cocoso-colors-theme-300: ${
        isGray ? 'rgb(125, 120, 115)' : getColor(hue, '75', saturation)
      };
      --cocoso-colors-theme-400: ${
        isGray ? 'rgb(105, 100, 95)' : getColor(hue, '65', saturation)
      };
      --cocoso-colors-theme-500: ${
        isGray ? 'rgb(88, 80, 75)' : getColor(accentHue, '40', accentSaturation)
      };
      --cocoso-colors-theme-600: ${
        isGray ? 'rgb(78, 70, 65)' : getColor(accentHue, '32', accentSaturation)
      };
      --cocoso-colors-theme-700: ${
        isGray ? 'rgb(68, 60, 52)' : getColor(accentHue, '20', accentSaturation)
      };
      --cocoso-colors-theme-800: ${
        isGray ? 'rgb(48, 40, 32)' : getColor(accentHue, '12', accentSaturation)
      };
      --cocoso-colors-theme-900: ${
        isGray ? 'rgb(25, 20, 15)' : getColor(accentHue, '8', accentSaturation)
      };

      --cocoso-border-color: ${theme?.body?.borderColor || 'transparent'};
      --cocoso-border-radius: ${theme?.body?.borderRadius || '0'};
      --cocoso-border-style: ${theme?.body?.borderStyle || 'solid'};
      --cocoso-border-width: ${theme?.body?.borderWidth || '0px'};
      --cocoso-box-shadow: var(--cocoso-skugga);
      --cocoso-body-font-family: ${bodyFontDefinition};
${MATERIALS}
      --cocoso-season: ${season};
${SEASON_VARS[season]}
    }

    body {
      font-family: ${bodyFontDefinition};
    }
  `;
};

/**
 * CLIENT-SIDE: inject or update the <style id="global-theme"> tag.
 */
export const applyGlobalStyles = (theme: any, season?: Season) => {
  if (typeof document === 'undefined') return; // SSR safety

  const css = getGlobalStyles(theme, season);
  if (season) {
    document.documentElement.setAttribute('data-season', season);
  }

  let tag = document.getElementById('global-theme') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'global-theme';
    document.head.appendChild(tag);
  }

  // Always overwrite completely for deterministic reactivity
  tag.innerHTML = css;
};

export const cocosoReactSelectAdapter = (base: any) => ({
  ...base,
  borderRadius: 'var(--cocoso-radius-falt)',
  borderColor: 'var(--cocoso-linje)',
  backgroundColor: 'var(--cocoso-papper)',
  ':hover': {
    borderColor: 'var(--cocoso-colors-theme-300)',
  },
  ':focus': {
    borderColor: 'var(--cocoso-colors-theme-500)',
  },
});
