import { Meteor } from 'meteor/meteor';

// What a method throws from a catch block: always a Meteor.Error with a
// string code and a string reason, so it can be sent to the browser.
// Throwing `new Meteor.Error(error)` with the caught error itself put the
// whole object in the answer; a schema validation error carries its
// ValidationContext, which cannot be turned into JSON, and that took the
// server down.
//
// - a Meteor.Error thrown further in ('not-authorized', …) is passed on as
//   it is, so its own code and reason reach the browser
// - a schema validation error becomes 'validation-error' with the schema's
//   message ("Label is required")
// - anything else is logged and becomes 'server-error' with the fallback
export default function methodError(error, fallback) {
  if (error instanceof Meteor.Error && typeof error.error !== 'object') {
    return error;
  }
  if (error?.validationContext || error?.name === 'ClientError') {
    return new Meteor.Error(
      'validation-error',
      String(error.message || fallback || 'The values are not valid')
    );
  }
  console.error('[method]', fallback || '', error);
  const reason =
    fallback ||
    (typeof error === 'string' ? error : error?.reason || error?.message) ||
    'Something went wrong';
  return new Meteor.Error('server-error', String(reason));
}
