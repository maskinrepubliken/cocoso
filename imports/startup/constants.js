// The menu a fresh install starts with: the Tranemo labels, with groups,
// works and info hidden (groups and works are switched off as features).
const defaultMenu = [
  {
    label: 'Evenemang',
    name: 'activities',
    isVisible: true,
    isHomePage: true,
    isComposablePage: false,
  },
  {
    label: 'Föreningar',
    name: 'groups',
    isVisible: false,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Kalender',
    name: 'calendar',
    isVisible: true,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Förfrågningar',
    name: 'works',
    description:
      'Samåk, låna, ge bort och hjälp varandra – grannar emellan i hela kommunen.',
    isVisible: false,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Arrangörer',
    name: 'people',
    description:
      'Här hittar du alla aktiva föreningar, verksamheter och eldsjälar.',
    isVisible: true,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Platser',
    name: 'resources',
    isVisible: true,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Äta, handla & bo',
    name: 'businesses',
    description:
      'Kaféer, restauranger, butiker och ställen att bo på i hela kommunen.',
    isVisible: true,
    isHomePage: false,
    isComposablePage: false,
  },
  {
    label: 'Info',
    name: 'info',
    isVisible: false,
    isHomePage: false,
    isComposablePage: false,
  },
];

const defaultMainColor = {
  hsl: {
    h: '144',
    s: 0.8,
    l: 0.35,
  },
};

// Texts for Admin → E-post (site.emails). [0] is the old welcome email,
// no longer sent; [1] and [2] go out when someone is verified as an
// organizer or made admin, in the design of roleEmails.js.
const defaultEmails = [
  {
    key: 'participant',
    subject: 'Välkommen!',
    appeal: 'Hej',
    body: 'Välkommen! Ditt konto är skapat.',
  },
  {
    key: 'cocreator',
    subject: 'Du är nu arrangör',
    appeal: 'Hej',
    body: 'En administratör har gjort dig till arrangör. Det betyder att du nu kan lägga upp egna evenemang i kalendern.\nLogga in som vanligt med din e-postadress, så kan du börja direkt.',
  },
  {
    key: 'admin',
    subject: 'Du är nu administratör',
    appeal: 'Hej',
    body: 'Du har fått rollen administratör. Utöver att lägga upp evenemang kan du nu hantera sidans innehåll, inställningar och medlemmar – till exempel verifiera nya arrangörer.\nAnvänd dina rättigheter varsamt.',
  },
];

// The "Hemma i Tranemo" palette: soft green floor, deep green accents.
const defaultTheme = {
  hue: '85',
  saturation: '45',
  accentHue: '118',
  accentSaturation: '48',
  body: {
    backgroundColor: 'var(--cocoso-season-golv)',
    backgroundImage: 'none',
    backgroundRepeat: 'no-repeat',
    borderRadius: '0.625rem',
    fontFamily: 'sans-serif',
  },
  menu: {
    backgroundColor: 'var(--cocoso-papper)',
    borderColor: 'var(--cocoso-colors-theme-200)',
    borderRadius: '0.25rem',
    borderStyle: 'solid',
    borderWidth: '0',
    color: 'var(--cocoso-colors-theme-700)',
    fontStyle: 'normal',
    textTransform: 'none',
  },
  variant: 'custom',
};

export { defaultEmails, defaultMainColor, defaultMenu, defaultTheme };
