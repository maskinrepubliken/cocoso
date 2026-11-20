import sharp from 'sharp';

import Activities from './activity';
import { resolveMediaPath, urlToKey } from '../_utils/services/mediaStorage';

// The shape of an event's first picture, kept on the event as
// `imageShape: { src, ratio }` (ratio = height / width), so its page can
// be laid out for a poster before the picture has loaded.
//
// It is worked out here, when the event is read, rather than wherever an
// event is saved (the form, the mirrors, seed scripts): `src` says which
// picture the ratio belongs to, so a changed picture is measured again the
// next time the page is opened, and events from before this get theirs the
// same way. A picture that is not in local storage gets no ratio; the
// page then measures it in the browser.

const firstImage = (activity) => activity.images?.[0] || activity.imageUrl;

const measure = async (src) => {
  const key = urlToKey(src);
  const file = key && resolveMediaPath(key);
  if (!file) {
    return null;
  }
  const { width, height } = await sharp(file).metadata();
  return width && height ? height / width : null;
};

// The activity with an up-to-date `imageShape`, stored if it had to be
// measured. Never fails the read: at worst the shape is left out.
export const attachImageShape = async (activity) => {
  const src = activity && firstImage(activity);
  if (!src || activity.imageShape?.src === src) {
    return activity;
  }
  try {
    const ratio = await measure(src);
    const imageShape = ratio ? { src, ratio } : { src };
    await Activities.updateAsync(
      { _id: activity._id },
      { $set: { imageShape } }
    );
    return { ...activity, imageShape };
  } catch {
    return activity;
  }
};
