import React, { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { useTranslation } from 'react-i18next';
import ArrowLeftIcon from 'lucide-react/dist/esm/icons/arrow-left';

import { Alert, Box, Heading } from '/imports/ui/core';
import AvatarUploader from '/imports/ui/pages/profile/AvatarUploader';
import ProfileForm from '/imports/ui/pages/profile/ProfileForm';
import Boxling from '/imports/ui/pages/admin/Boxling';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import { call } from '/imports/api/_utils/shared';
import {
  resizeBeforeUpload,
  uploadImage,
} from '/imports/api/_utils/services/clientUpload';
import { message } from '/imports/ui/generic/message';

interface EditableUser {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  contactInfo?: string;
  publicContact?: { email?: string; phone?: string; website?: string };
  avatar?: { src?: string };
  isOrganizer?: boolean;
}

// An admin editing an organizer's profile, reached from the pen on the
// organizer's page: picture, name, description and public contact, the
// same as the person edits on their own profile settings.
export default function EditUserProfile() {
  const { user } = useLoaderData() as { user: EditableUser | null };
  const revalidator = useRevalidator();
  const [t] = useTranslation('accounts');
  const [tc] = useTranslation('common');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadableAvatar, setUploadableAvatar] = useState<File | null>(null);
  const [uploadableAvatarLocal, setUploadableAvatarLocal] = useState<
    string | null
  >(null);

  if (!user) {
    return <Alert type="error">{tc('message.access.deny')}</Alert>;
  }

  const name = displayName(user);
  const savedMessage = () =>
    message.success(
      tc('message.success.save', { domain: tc('domains.profile') })
    );

  const handleSubmitInfo = async (values: any) => {
    try {
      await call('saveUserInfoAsAdmin', user._id, {
        firstName: values.firstName || '',
        lastName: values.lastName || '',
        bio: values.bio || '',
        contactInfo: values.contactInfo || '',
        publicContact: {
          email: values.publicContact?.email || '',
          phone: values.publicContact?.phone || '',
          website: values.publicContact?.website || '',
        },
      });
      savedMessage();
      revalidator.revalidate();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const handleSetUploadableAvatar = (files: FileList | null) => {
    if (!files) {
      setUploadableAvatar(null);
      setUploadableAvatarLocal(null);
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener('load', () => {
      setUploadableAvatar(file);
      setUploadableAvatarLocal(reader.result as string);
    });
  };

  const uploadAvatar = async () => {
    if (!uploadableAvatar) {
      return;
    }
    setIsUploading(true);
    try {
      const resized = await resizeBeforeUpload(uploadableAvatar, 1200);
      const result = await uploadImage(resized!, 'avatar');
      await call('setAvatarAsAdmin', user._id, result.variants.full);
      savedMessage();
      setUploadableAvatar(null);
      setUploadableAvatarLocal(null);
      revalidator.revalidate();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box>
      <Link className="admin-back-link" to={`/@${user.username}`}>
        <ArrowLeftIcon width={16} height={16} aria-hidden />
        {name}
      </Link>

      <Boxling mb="8">
        <Heading size="md" css={{ marginBottom: '1rem' }}>
          {t('profile.image')}
        </Heading>
        <AvatarUploader
          imageUrl={
            uploadableAvatarLocal || getImageUrl(user.avatar?.src, 'medium')
          }
          isUploading={isUploading}
          uploadableAvatarLocal={uploadableAvatarLocal}
          removeAvatar={() => handleSetUploadableAvatar(null)}
          uploadAvatar={uploadAvatar}
          setUploadableAvatar={handleSetUploadableAvatar}
          setUploadableAvatarLocal={setUploadableAvatarLocal}
        />
      </Boxling>

      <Boxling mb="8">
        <Heading size="md" css={{ margin: '0.5rem 0' }}>
          {t('profile.label')}
        </Heading>
        <Box mb="4">
          <ProfileForm
            key={user._id}
            contactRequired={Boolean(user.isOrganizer)}
            defaultValues={user}
            onSubmit={handleSubmitInfo}
          />
        </Box>
      </Boxling>
    </Box>
  );
}
