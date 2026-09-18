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

interface SchemasType {
  Id: SchemaField;
  Email: SchemaField;
  Src: SchemaField;
  Avatar: AvatarSchema;
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
};

export { Schemas };
