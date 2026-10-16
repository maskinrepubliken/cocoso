import { atom } from 'jotai';

export const initialLoader = {
  isCreating: false,
  isUploadingImages: false,
  isSendingForm: false,
  isSuccess: false,
};

export const loaderAtom = atom({ ...initialLoader });

export const getLoaderProgress = (loaders) => {
  if (!loaders) {
    return 0;
  }
  if (loaders.isSuccess) {
    return 100;
  }
  if (loaders.isSendingForm) {
    return 80;
  }
  if (loaders.isUploadingImages) {
    return 40;
  }
  if (loaders.isCreating) {
    return 20;
  }
  return 0;
};
