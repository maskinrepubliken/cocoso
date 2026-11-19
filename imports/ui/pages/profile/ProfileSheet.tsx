import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';

import { call } from '/imports/api/_utils/shared';
import {
  resizeBeforeUpload,
  uploadImage,
} from '/imports/api/_utils/services/clientUpload';
import { currentUserAtom, roleAtom } from '/imports/state';
import { Loader } from '/imports/ui/core';
import EntryFormHandler from '/imports/ui/forms/EntryFormHandler';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';
import { dismissFormError, message } from '/imports/ui/generic/message';
import { initialLoader, loaderAtom } from '/imports/ui/utils/loaderHandler';

import ProfileForm, {
  type EditableProfile,
  type ProfileExtras,
  type ProfileFormValues,
} from './ProfileForm';

// The address as the server takes it, whatever the picker left in it:
// its four parts and nothing else, the point as two numbers
const plainAddress = (address?: ProfileFormValues['address']) => {
  if (!address) {
    return null;
  }
  const lat = Number(address.coordinates?.lat);
  const lng = Number(address.coordinates?.lng);
  return {
    street: String(address.street || ''),
    postalCode: String(address.postalCode || ''),
    city: String(address.city || ''),
    ...(address.coordinates && Number.isFinite(lat) && Number.isFinite(lng)
      ? { coordinates: { lat, lng } }
      : {}),
  };
};

interface ProfileSheetProps {
  // Whose profile: one's own, or (for an admin) anyone's
  username: string;
}

// Editing a profile, in the same sheet as an event or a place: opened with
// ?edit=true from the gear on the person's page. The picture and the
// fields are all saved by the sheet's Save. The settings (language,
// notifications) have a dialog of their own, SettingsModal.
export default function ProfileSheet({ username }: ProfileSheetProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const setLoaders = useSetAtom(loaderAtom);
  const saveFailed = useSaveFailed();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [tc] = useTranslation('common');

  const isSelf = currentUser?.username === username;
  const mayEdit = Boolean(currentUser && (isSelf || role === 'admin'));
  const open = mayEdit && searchParams.get('edit') === 'true';

  const handleClose = () => {
    setLoaders({ ...initialLoader });
    dismissFormError();
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete('edit');
        return next;
      },
      { replace: true }
    );
  };

  // The profile as saved, fetched each time the sheet opens
  useEffect(() => {
    if (!open) {
      setProfile(null);
      return;
    }
    call<EditableProfile>('getProfileToEdit', username)
      .then(setProfile)
      .catch((error: any) => {
        message.error(error.reason || error.error);
        handleClose();
      });
  }, [open, username]);

  if (!mayEdit) {
    return null;
  }

  const save = async (
    values: Partial<ProfileFormValues>,
    extras: ProfileExtras
  ) => {
    if (!profile) {
      return;
    }
    setLoaders((prevState) => ({ ...prevState, isCreating: true }));
    // One's own profile through one's own methods, so that an admin's is
    // saved like everyone else's
    const asAdmin = !isSelf;
    try {
      if (extras.avatar) {
        setLoaders((prevState) => ({ ...prevState, isUploadingImages: true }));
        const resized = await resizeBeforeUpload(extras.avatar, 1200);
        const result = await uploadImage(resized!, 'avatar');
        const src = result.variants.full;
        await (asAdmin
          ? call('setAvatarAsAdmin', profile._id, src)
          : call('setAvatar', src));
      } else if (extras.avatar === null) {
        await (asAdmin
          ? call('setAvatarAsAdmin', profile._id, null)
          : call('setAvatar', null));
      }
      setLoaders((prevState) => ({ ...prevState, isSendingForm: true }));
      const info = {
        // The one name, where the two used to be
        firstName: (values.name || '').trim(),
        lastName: '',
        bio: values.bio || '',
        publicContact: {
          email: values.publicContact?.email || '',
          phone: values.publicContact?.phone || '',
          website: values.publicContact?.website || '',
        },
        // Only organizers have an address and place on their profile
        ...(profile.isOrganizer
          ? {
              homePlaceId:
                typeof values.homePlaceId === 'string'
                  ? values.homePlaceId
                  : null,
              address: plainAddress(values.address),
              locationId:
                typeof values.locationId === 'string'
                  ? values.locationId
                  : null,
            }
          : {}),
      };
      await (asAdmin
        ? call('saveUserInfoAsAdmin', profile._id, info)
        : call('saveUserInfo', info));
      setUpdated(profile._id);
      setTimeout(() => setUpdated(null), 1000);
    } catch (error: any) {
      saveFailed(error);
    }
  };

  return (
    <EntryFormHandler
      context="profile"
      forEdit
      open={open}
      title={tc(isSelf ? 'labels.update.myProfile' : 'labels.update.profile')}
      onClose={handleClose}
    >
      <SuccessRedirector forEdit ping={updated || undefined}>
        {profile ? (
          <ProfileForm key={profile._id} profile={profile} onSubmit={save} />
        ) : (
          <Loader />
        )}
      </SuccessRedirector>
    </EntryFormHandler>
  );
}
