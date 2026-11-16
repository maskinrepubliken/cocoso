import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';

import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import {
  DraftNotice,
  draftBase,
  useDraftKey,
  useKeepDraft,
  useLoadedDraft,
} from '/imports/ui/forms/useFormDraft';

import pageFormFields from './pageFormFields';

interface PageFormValues {
  longDescription: string;
  title: string;
}

interface PageData extends PageFormValues {
  images?: string[];
  order?: number;
}

interface PageFormProps {
  page?: PageData;
  // The page being edited, for its own draft
  pageId?: string;
  // Resolves to true once saved, which throws the draft away
  onFinalize: (page: PageData) => Promise<boolean | void> | void;
}

export const emptyFormValues: PageFormValues = {
  longDescription: '',
  title: '',
};

const TEXT_FIELDS = ['title', 'longDescription'] as const;

// The page form keeps a draft of what is written in this browser until the
// page is saved; throwing the draft away starts the form over.
export default function PageForm(props: PageFormProps) {
  const { key, formKey, discard } = useDraftKey(
    `info:${props.pageId || 'new'}`
  );
  return (
    <InfoPageForm key={formKey} {...props} draftKey={key} onDiscard={discard} />
  );
}

function InfoPageForm({
  page,
  onFinalize,
  draftKey,
  onDiscard,
}: PageFormProps & { draftKey: string; onDiscard: () => void }) {
  // Editing: the page as saved, so a draft from before it was saved again
  // is dropped rather than undoing that
  const [base] = useState(() =>
    page ? draftBase({}, page, [], TEXT_FIELDS) : undefined
  );
  const draft = useLoadedDraft(draftKey, base);
  const defaultValues = {
    ...(page || emptyFormValues),
    ...(draft?.data.values || {}),
  };
  const [state, setState] = useState({
    formValues: defaultValues,
  });
  // Only texts: nothing is chosen outside them
  const [noState] = useState({});
  const { onValuesChange, markSaved } = useKeepDraft({
    key: draftKey,
    draft,
    state: noState,
    pristineState: noState,
    pristineValues: page || emptyFormValues,
    stateFields: [],
    textFields: TEXT_FIELDS,
    base,
  });
  const [loaders, setLoaders] = useAtom(loaderAtom);
  const [t] = useTranslation('admin');

  useEffect(() => {
    if (!loaders?.isCreating) {
      return;
    }
    setLoaders((prevState) => ({
      ...prevState,
      isUploadingImages: true,
    }));
  }, [loaders?.isCreating]);

  const handleSubmit = (formValues: PageFormValues) => {
    setState((prevState) => ({
      ...prevState,
      formValues,
    }));
    setLoaders((prevState) => ({
      ...prevState,
      isCreating: true,
    }));
  };

  const parsePage = async (images: string[]) => {
    const newPage: PageData = {
      ...state.formValues,
      images,
    };
    if ((await onFinalize(newPage)) === true) {
      markSaved();
    }
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));

    parsePage(images);
  };

  return (
    <>
      <DraftNotice draft={draft} onDiscard={onDiscard} />
      <GenericEntryForm
        childrenIndex={1}
        defaultValues={defaultValues}
        formFields={pageFormFields(t)}
        onSubmit={handleSubmit}
        onValuesChange={onValuesChange}
      >
        <FormField
          area="main"
          helper={t('pages.form.images.helper')}
          label={t('pages.form.images.label')}
          my="4"
        >
          <ImageUploader
            ping={loaders?.isUploadingImages}
            preExistingImages={page ? page.images : []}
            onUploadedImages={handleUploadedImages}
          />
        </FormField>
      </GenericEntryForm>
    </>
  );
}
