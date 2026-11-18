import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';

import { call } from '/imports/api/_utils/shared';
import { Checkbox, Input, Textarea } from '/imports/ui/core';
import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import {
  DraftNotice,
  draftBase,
  useDraftKey,
  useKeepDraft,
  useLoadedDraft,
} from '/imports/ui/forms/useFormDraft';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { message } from '/imports/ui/generic/message';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';
import type { CategoryItem } from '/imports/ui/types';

import workFormFields from './workFormFields';
import { REQUEST_KINDS, findRequestKind } from './requestKinds';

interface WorkFormValues {
  longDescription: string;
  shortDescription: string;
  title: string;
}

interface WorkData extends WorkFormValues {
  additionalInfo?: string;
  contactInfo?: string;
  showAvatar?: boolean;
  category?: Partial<CategoryItem> & { label: string };
  images?: string[];
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
}

interface WorkFormProps {
  work?: WorkData;
  // The request being edited, for its own draft
  workId?: string;
  // Resolves to true once saved, which throws the draft away
  onFinalize: (work: WorkData) => Promise<boolean | void> | void;
}

export const emptyFormValues: WorkFormValues = {
  longDescription: '',
  shortDescription: '',
  title: '',
};

// What a draft keeps (see useFormDraft): the typed texts, and everything
// chosen in the cards. Pictures not yet uploaded are not.
const DRAFT_FIELDS = [
  'kind',
  'locationId',
  'isMunicipalityOnly',
  'contactInfo',
  'additionalInfo',
  'showAvatar',
] as const;
const TEXT_FIELDS = ['title', 'shortDescription', 'longDescription'] as const;

// The request form, laid out like the event and place forms: what it is
// and its pictures in the wide column, the details as cards beside it. It
// keeps a draft of what is written in this browser until the request is
// saved; throwing the draft away starts the form over.
export default function WorkForm(props: WorkFormProps) {
  const { key, formKey, discard } = useDraftKey(
    `request:${props.workId || 'new'}`
  );
  return (
    <RequestForm key={formKey} {...props} draftKey={key} onDiscard={discard} />
  );
}

function RequestForm({
  work,
  onFinalize,
  draftKey,
  onDiscard,
}: WorkFormProps & { draftKey: string; onDiscard: () => void }) {
  const [t] = useTranslation('members');
  const [tc] = useTranslation('common');
  const [pristine] = useState<any>(() => ({
    kind: findRequestKind(work?.category?.label)?.key || '',
    locationId: work?.locationId || null,
    isMunicipalityOnly: Boolean(work?.isMunicipalityOnly),
    contactInfo: work?.contactInfo || '',
    additionalInfo: work?.additionalInfo || '',
    showAvatar: work ? work.showAvatar !== false : true,
  }));
  // Editing: the request as saved, so a draft from before it was saved
  // again is dropped rather than undoing that
  const [base] = useState(() =>
    work ? draftBase(pristine, work, DRAFT_FIELDS, TEXT_FIELDS) : undefined
  );
  const draft = useLoadedDraft(draftKey, base);
  const defaultValues = {
    ...(work || emptyFormValues),
    ...(draft?.data.values || {}),
  };
  const [state, setState] = useState<any>(() => ({
    ...pristine,
    ...(draft?.data.state || {}),
    formValues: defaultValues,
  }));
  const { onValuesChange, markSaved } = useKeepDraft({
    key: draftKey,
    draft,
    state,
    pristineState: pristine,
    pristineValues: work || emptyFormValues,
    stateFields: DRAFT_FIELDS,
    textFields: TEXT_FIELDS,
    base,
  });
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loaders, setLoaders] = useAtom(loaderAtom);

  const set = (values: Record<string, any>) =>
    setState((prevState: any) => ({ ...prevState, ...values }));

  // The kinds are categories in the database too; their ids go along
  useEffect(() => {
    call('getCategories')
      .then((found) => setCategories((found as CategoryItem[]) || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!loaders || !loaders.isCreating) {
      return;
    }
    setLoaders((prevState) => ({
      ...prevState,
      isUploadingImages: true,
    }));
  }, [loaders?.isCreating]);

  const handleSubmit = (formValues: WorkFormValues) => {
    if (!state.kind) {
      message.formError(t('works.form.kindMissing'));
      return;
    }
    set({ formValues });
    setLoaders((prevState) => ({
      ...prevState,
      isCreating: true,
    }));
  };

  const parseWork = async (images: string[]) => {
    const kind = REQUEST_KINDS.find((k) => k.key === state.kind);
    if (!kind) return;
    const category = categories.find((c) => c.label === kind.label);
    const newWork: WorkData = {
      ...state.formValues,
      category: { label: kind.label, ...(category ? { _id: category._id } : {}) },
      contactInfo: state.contactInfo,
      additionalInfo: state.additionalInfo,
      showAvatar: state.showAvatar,
      images,
      locationId: state.locationId,
      isMunicipalityOnly: state.isMunicipalityOnly,
    };
    if ((await onFinalize(newWork)) === true) {
      markSaved();
    }
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));
    parseWork(images);
  };

  return (
    <>
      <DraftNotice draft={draft} onDiscard={onDiscard} />
      <GenericEntryForm
        childrenIndex={3}
        defaultValues={defaultValues}
        formFields={workFormFields(t)}
        onSubmit={handleSubmit}
        onValuesChange={onValuesChange}
      >
        <FormField
          area="main"
          helper={t('works.image.helper')}
          label={t('works.image.label')}
          mb="12"
        >
          <ImageUploader
            ping={loaders?.isUploadingImages}
            preExistingImages={work ? work.images : []}
            onUploadedImages={handleUploadedImages}
          />
        </FormField>

        {/* The details as cards in the right column, as in the event and
          place forms */}
        <FormCard title={t('works.form.kind')}>
          <p className="form-preview-note">{t('works.form.kindHelper')}</p>
          <ChoiceChips
            label={t('works.form.kind')}
            value={state.kind}
            choices={REQUEST_KINDS.map(({ key, icon: Icon }) => ({
              value: key,
              label: tc(`requests.kinds.${key}.name`),
              icon: <Icon aria-hidden />,
              description: tc(`requests.kinds.${key}.description`),
            }))}
            onChange={(kind) => set({ kind })}
          />
        </FormCard>

        <FormCard title={t('works.form.where')}>
          <p className="form-preview-note">
            {tc('locations.form.helperWork')}
          </p>
          <LocationSelect
            allowMunicipalityOnly
            isMunicipalityOnly={state.isMunicipalityOnly}
            value={state.locationId}
            onChange={(choice) => set(choice)}
          />
        </FormCard>

        <FormCard title={t('works.form.contact')}>
          <p className="form-preview-note">{t('works.form.contactHelper')}</p>
          <Textarea
            aria-label={t('works.form.contact')}
            placeholder={t('works.contact.holder')}
            rows={2}
            value={state.contactInfo}
            onChange={(event) => set({ contactInfo: event.target.value })}
          />
          <div style={{ marginTop: '1rem' }}>
            <Checkbox
              checked={state.showAvatar}
              id="work-show-profile"
              onChange={(event) => set({ showAvatar: event.target.checked })}
            >
              {t('works.form.profile')}
            </Checkbox>
            <p className="form-preview-note">
              {t('works.form.profileHelper')}
            </p>
          </div>
        </FormCard>

        <FormCard title={t('works.form.extra')}>
          <p className="form-preview-note">{t('works.form.extraHelper')}</p>
          <Input
            aria-label={t('works.form.extra')}
            placeholder={t('works.extra.holder')}
            value={state.additionalInfo}
            onChange={(event) => set({ additionalInfo: event.target.value })}
          />
        </FormCard>
      </GenericEntryForm>
    </>
  );
}
