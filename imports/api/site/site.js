import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import SimpleSchema from 'simpl-schema';

import { Schemas } from '../_utils/schemas';

// The one site this deployment serves. There is exactly one document in
// this collection; it holds the name, contact details, logo, menu, theme and
// email templates. Read it with getSite().
const Site = new Mongo.Collection('site');

const SchemasSite = {
  menu: {
    description: { type: String, optional: true },
    isHomePage: { type: Boolean, optional: true },
    isVisible: { type: Boolean },
    isComposablePage: {
      type: Boolean,
      defaultValue: false,
      optional: true,
    },
    label: { type: String },
    name: { type: String },
  },
  emailTemplate: {
    title: { type: String, optional: true },
    key: { type: String, optional: true },
    subject: { type: String },
    appeal: { type: String },
    body: { type: String },
  },
};

Site.schema = new SimpleSchema({
  _id: Schemas.Id,

  logo: { type: String, optional: true },
  logoLegacy: { type: String, optional: true },
  // PNG rendition of `logo`, for email clients (Gmail) that don't render
  // a transparent WebP background well. Set at upload time (see
  // assignSiteLogo).
  logoPng: { type: String, optional: true },

  settings: { type: Object },
  'settings.name': { type: String },
  // Short form shown in the header pill ("Tranemo"); falls back to name.
  'settings.shortName': { type: String, optional: true },
  'settings.email': Schemas.Email,
  'settings.address': { type: String },
  'settings.city': { type: String },
  'settings.country': { type: String },
  'settings.lang': { type: String, optional: true },
  'settings.menu': { type: Array },
  'settings.menu.$': new SimpleSchema(SchemasSite.menu),
  'settings.mainColor': { type: Object, optional: true },
  'settings.backgroundColor': { type: String, optional: true },
  'settings.backgroundImage': { type: String, optional: true },
  'settings.footer': { type: String, optional: true },
  'settings.hue': { type: String, optional: true },
  'settings.isBurgerMenuOnDesktop': {
    type: Boolean,
    optional: true,
    defaultValue: false,
  },
  'settings.isBurgerMenuOnMobile': {
    type: Boolean,
    optional: true,
    defaultValue: false,
  },

  theme: { type: Object, optional: true },
  'theme.hue': { type: String, optional: true },
  // Optional: the saturation of the palette, and a separate hue and
  // saturation for the dark shades (500–900) used for text and details.
  'theme.saturation': { type: String, optional: true },
  'theme.accentHue': { type: String, optional: true },
  'theme.accentSaturation': { type: String, optional: true },
  'theme.body': { type: Object, optional: true },
  'theme.body.backgroundColor': { type: String, optional: true },
  'theme.body.backgroundImage': { type: String, optional: true },
  'theme.body.backgroundRepeat': { type: String, optional: true },
  'theme.body.borderRadius': { type: String, optional: true },
  'theme.body.fontFamily': { type: String, optional: true },
  'theme.menu': { type: Object, optional: true },
  'theme.menu.backgroundColor': { type: String, optional: true },
  'theme.menu.borderColor': { type: String, optional: true },
  'theme.menu.borderRadius': { type: String, optional: true },
  'theme.menu.borderStyle': { type: String, optional: true },
  'theme.menu.borderWidth': { type: String, optional: true },
  'theme.menu.color': { type: String, optional: true },
  'theme.menu.fontStyle': { type: String, optional: true },
  'theme.menu.textTransform': { type: String, optional: true },
  'theme.variant': { type: String, optional: true },

  emails: { type: Array },
  'emails.$': new SimpleSchema(SchemasSite.emailTemplate),

  createdAt: { type: Date },
});

Site.attachSchema(Site.schema);

// Fields safe to send to any visitor.
export const sitePublicFields = {
  logo: 1,
  logoLegacy: 1,
  logoPng: 1,
  settings: 1,
  theme: 1,
};

export async function getSite(fields) {
  return await Site.findOneAsync({}, fields ? { fields } : {});
}

export default Site;
