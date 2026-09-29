// Helper for hue-based colors
const getColor = (hue: number, lightness: string, saturation: number = 80) =>
  `hsl(${hue}deg, ${saturation}%, ${lightness}%)`;

/**
 * Create a CSS string for the given theme.
 * Shared between SSR + client.
 */
export const getGlobalStyles = (theme: any): string => {
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
      --cocoso-box-shadow: 1px 1px 0px rgba(205, 205, 205, 0.5), 1px 1px 3px rgba(55, 55, 55, 0.5);
      --cocoso-body-font-family: ${bodyFontDefinition};
    }

    body {
      font-family: ${bodyFontDefinition};
    }
  `;
};

/**
 * CLIENT-SIDE: inject or update the <style id="global-theme"> tag.
 */
export const applyGlobalStyles = (theme: any) => {
  if (typeof document === 'undefined') return; // SSR safety

  const css = getGlobalStyles(theme);

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
  borderRadius: 'var(--cocoso-border-radius)',
  borderColor: 'var(--cocoso-colors-theme-200)',
  ':hover': {
    borderColor: 'var(--cocoso-colors-theme-300)',
  },
  ':focus': {
    borderColor: 'var(--cocoso-colors-theme-500)',
  },
});
