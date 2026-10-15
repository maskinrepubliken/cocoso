import SimpleSchema from 'simpl-schema';
import 'meteor/aldeed:collection2/static';

interface SchemaField {
  type: StringConstructor | DateConstructor;
  regEx?: RegExp | string;
  optional?: boolean;
}

interface AvatarSchema {
  src: { type: StringConstructor };
  date: { type: DateConstructor };
}

interface PublicContactSchema {
  name: SchemaField;
  email: SchemaField;
  phone: SchemaField;
  website: SchemaField;
}

interface AddressSchema {
  street: SchemaField;
  postalCode: SchemaField;
  city: SchemaField;
  coordinates: { type: ObjectConstructor; optional: boolean };
  'coordinates.lat': { type: NumberConstructor };
  'coordinates.lng': { type: NumberConstructor };
}

interface SchemasType {
  Id: SchemaField;
  Email: SchemaField;
  Src: SchemaField;
  Avatar: AvatarSchema;
  PublicContact: PublicContactSchema;
  Address: AddressSchema;
}

const Schemas: SchemasType = {
  Id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  Email: {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    optional: true,
  },
  Src: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
  },
  Avatar: {
    src: {
      type: String,
    },
    date: { type: Date },
  },
  // Contact details meant to be shown to everyone: a user's, a resource's,
  // a group's or an event's own. All optional, all plain text; who must
  // have an email or a phone is decided in imports/api/_utils/contact.ts.
  PublicContact: {
    name: { type: String, optional: true },
    email: { type: String, optional: true },
    phone: { type: String, optional: true },
    website: { type: String, optional: true },
  },
  // A street address, see imports/api/_utils/address.ts.
  Address: {
    street: { type: String, optional: true },
    postalCode: { type: String, optional: true },
    city: { type: String },
    coordinates: { type: Object, optional: true },
    'coordinates.lat': { type: Number },
    'coordinates.lng': { type: Number },
  },
};

export { Schemas };
