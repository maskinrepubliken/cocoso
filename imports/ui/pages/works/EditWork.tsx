import React, { useState } from 'react';
import { useAtom } from 'jotai';

import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';
import { call } from '/imports/api/_utils/shared';

import WorkForm from './WorkForm';
import { workAtom } from './WorkItemHandler';

export default function EditWork() {
  const saveFailed = useSaveFailed();
  const [updated, setUpdated] = useState<string | null>(null);
  const [work, setWork] = useAtom(workAtom);

  const updateWork = async (newWork: any) => {
    if (!work) return false;
    const workId = work._id;
    try {
      await call('updateWork', workId, newWork);
      // Read back under its author, whoever edited it
      setWork(await call('getWorkById', workId, (work as any).authorUsername));
      setUpdated(workId);
      setTimeout(() => {
        setUpdated(null);
      }, 1000);
      return true;
    } catch (error: any) {
      saveFailed(error);
      return false;
    }
  };

  if (!work) {
    return null;
  }

  const workFields = (({
    category,
    contactInfo,
    images,
    locationId,
    isMunicipalityOnly,
    longDescription,
    shortDescription,
    showAvatar,
    title,
  }: any) => ({
    category,
    contactInfo,
    images,
    locationId,
    isMunicipalityOnly,
    // A request has one description now: an older one's short
    // description becomes its first paragraph, and is saved empty
    longDescription: withShortDescription(shortDescription, longDescription),
    shortDescription: '',
    showAvatar,
    title,
  }))(work);

  return (
    <SuccessRedirector forEdit ping={updated}>
      <WorkForm
        work={workFields}
        workId={work._id}
        onFinalize={updateWork}
      />
    </SuccessRedirector>
  );
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The description with an older request's short description before it
function withShortDescription(short?: string, long?: string) {
  const text = (short || '').trim();
  return text ? `<p>${escapeHtml(text)}</p>${long || ''}` : long || '';
}
