// The group form's typed fields, in the wide column; the details are cards
// beside them (GroupForm.tsx).
const groupFormFields = (t) => [
  {
    helper: t('groupForm.title.helper'),
    label: t('groupForm.title.label'),
    placeholder: t('groupForm.title.holder'),
    type: 'input',
    value: 'title',
    props: {
      required: true,
    },
  },
  {
    helper: t('groupForm.lead.helper'),
    label: t('groupForm.lead.label'),
    placeholder: t('groupForm.lead.holder'),
    type: 'input',
    value: 'readingMaterial',
    props: {
      required: true,
    },
  },
  {
    helper: t('groupForm.description.helper'),
    label: t('groupForm.description.label'),
    placeholder: t('groupForm.description.holder'),
    type: 'quill',
    value: 'description',
    props: {
      required: true,
    },
  },
];

export default groupFormFields;
