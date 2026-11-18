// The request form's typed fields, in the wide column; the details are
// cards beside them (WorkForm.tsx).
const workFormFields = (t) => [
  {
    helper: t('works.title.helper'),
    label: t('works.title.label'),
    placeholder: t('works.title.holder'),
    type: 'input',
    value: 'title',
    props: {
      required: true,
    },
  },
  {
    helper: t('works.longDescription.helper'),
    label: t('works.longDescription.label'),
    placeholder: t('works.longDescription.holder'),
    type: 'quill',
    value: 'longDescription',
  },
];

export default workFormFields;
