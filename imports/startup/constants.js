const defaultMenu = [
  {
    label: 'Activities',
    name: 'activities',
    isVisible: true,
    isHomePage: true,
  },
  {
    label: 'Groups',
    name: 'groups',
    isVisible: true,
    isHomePage: false,
  },
  {
    label: 'Calendar',
    name: 'calendar',
    isVisible: true,
    isHomePage: false,
  },
  {
    label: 'Works',
    name: 'works',
    isVisible: true,
    isHomePage: false,
  },
  {
    label: 'People',
    name: 'people',
    isVisible: true,
    isHomePage: false,
  },
  {
    label: 'Resources',
    name: 'resources',
    isVisible: true,
    isHomePage: false,
  },
  {
    label: 'Info',
    name: 'info',
    isVisible: true,
    isHomePage: false,
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
    subject: 'Du är nu verifierad arrangör',
    appeal: 'Hej',
    body: 'En administratör har verifierat dig som arrangör. Det betyder att du nu kan lägga upp egna evenemang i kalendern.\nLogga in som vanligt med din e-postadress, så kan du börja direkt.',
  },
  {
    key: 'admin',
    subject: 'Du är nu administratör',
    appeal: 'Hej',
    body: 'Du har fått rollen administratör. Utöver att lägga upp evenemang kan du nu hantera sidans innehåll, inställningar och medlemmar – till exempel verifiera nya arrangörer.\nAnvänd dina rättigheter varsamt.',
  },
];

const defaultTheme = {
  hue: (Math.floor(Math.random() * 360) + 1).toString(),
  body: {
    backgroundColor: 'var(--cocoso-colors-theme-100)',
    backgroundImage: 'none',
    backgroundRepeat: 'no-repeat',
    borderRadius: '0.25rem',
    fontFamily: 'sans-serif',
  },
  menu: {
    backgroundColor: 'var(--cocoso-colors-theme-50)',
    borderColor: 'var(--cocoso-colors-theme-200)',
    borderRadius: '0.25rem',
    borderStyle: 'solid',
    borderWidth: '0',
    color: 'var(--cocoso-colors-theme-800)',
    fontStyle: 'normal',
    textTransform: 'none',
  },
  variant: 'custom',
};

export { defaultEmails, defaultMainColor, defaultMenu, defaultTheme };
