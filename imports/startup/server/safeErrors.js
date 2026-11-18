import { DDPCommon } from 'meteor/ddp-common';

// A method's answer is sent to the browser as JSON. Many methods still do
// `throw new Meteor.Error(error)` with the error they caught; when that is
// a schema validation error it carries its ValidationContext, which points
// back at itself, and JSON.stringify threw inside the DDP session: the
// whole server went down on one failed save. A message that cannot be sent
// as it is now goes out with the error reduced to plain text, and the
// method's name is not known here, so the cause is logged with what there is.
const stringifyDDP = DDPCommon.stringifyDDP;

const text = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return value?.reason || value?.message || undefined;
};

DDPCommon.stringifyDDP = (msg) => {
  try {
    return stringifyDDP(msg);
  } catch (failure) {
    if (!msg?.error) {
      throw failure;
    }
    const { error } = msg;
    const cause = error.error;
    const code =
      typeof cause === 'string' || typeof cause === 'number'
        ? cause
        : cause?.error || 'server-error';
    const reason = text(cause) || text(error.reason) || 'Something went wrong';
    console.error(
      `[ddp] a method (${msg.id}) answered with an error that cannot be sent; sent as "${reason}"`
    );
    return stringifyDDP({
      ...msg,
      error: {
        isClientSafe: true,
        error:
          typeof code === 'string' || typeof code === 'number'
            ? code
            : 'server-error',
        reason: String(reason),
        message: `${reason} [${code}]`,
        errorType: 'Meteor.Error',
      },
    });
  }
};
