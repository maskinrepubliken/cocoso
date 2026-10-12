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
  email: SchemaField;
  phone: SchemaField;
  website: SchemaField;
}

interface SchemasType {
  Id: SchemaField;
  Email: SchemaField;
  Src: SchemaField;
  Avatar: AvatarSchema;
  PublicContact: PublicContactSchema;
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
  // Contact details meant to be shown to everyone: an organizer's, or an
  // event's own. All optional, all plain text.
  PublicContact: {
    email: { type: String, optional: true },
    phone: { type: String, optional: true },
    website: { type: String, optional: true },
  },
};

export { Schemas };
