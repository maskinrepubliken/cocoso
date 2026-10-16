import React, { useEffect } from 'react';
import { Controller, useForm, Control, UseFormRegister } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  NumberInput,
  Select,
  Textarea,
} from '/imports/ui/core';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';

import Quill from './Quill';
import FormField from './FormField';
import { useEntryFormSheet } from './EntryFormSheet.context';

interface Option {
  value: string;
  label: string;
}

// Where a field sits when there is room for two columns: the content that
// matters most (title, text, pictures, dates) in the wide main column, the
// details beside it.
export type FormArea = 'main' | 'side';

interface FormFieldItem {
  area?: FormArea;
  type: 'input' | 'textarea' | 'checkbox' | 'select' | 'quill' | 'number';
  value?: string | boolean;
  checked?: boolean;
  id?: string;
  props?: Record<string, any>;
  placeholder?: string | undefined;
  options?: Option[];
  helper?: string;
  label?: string;
  optional?: boolean;
  helperInline?: boolean;
  asHeading?: boolean;
  children?: string | React.ReactNode;
}

interface FieldItemHandlerProps {
  control: Control<any>;
  item: FormFieldItem;
  register: UseFormRegister<any>;
}

interface GenericEntryFormProps {
  childrenIndex?: number;
  children?: React.ReactNode;
  defaultValues?: Record<string, any> | null;
  formFields: FormFieldItem[];
  isSubmitButtonDisabled: boolean;
  onSubmit: () => void;
}

// The name of the entry is the field everything else hangs on.
const LEAD_FIELDS = new Set(['title', 'label']);

const itemArea = (item: FormFieldItem): FormArea =>
  item.area ||
  (item.type === 'checkbox' || item.type === 'number' ? 'side' : 'main');

// A child's area is its own `area` prop; without one, it is a detail.
const childArea = (child: React.ReactNode): FormArea =>
  React.isValidElement(child) &&
  (child.props as { area?: FormArea }).area === 'main'
    ? 'main'
    : 'side';

const flattenChildren = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap((child) =>
    React.isValidElement(child) && child.type === React.Fragment
      ? flattenChildren(
          (child.props as { children?: React.ReactNode }).children
        )
      : [child]
  );

function FieldItemHandler({ control, item, register }: FieldItemHandlerProps) {
  const props = {
    ...register(item.value as string),
    ...item.props,
    placeholder: item.placeholder,
  };

  switch (item.type) {
    case 'input':
      return <Input {...props} />;
    case 'textarea':
      return <Textarea {...props} />;
    case 'checkbox':
      return (
        <Controller
          control={control}
          name={item.value as string}
          render={({ field }) => (
            <Checkbox
              id={item.id}
              size="lg"
              checked={field.value}
              onChange={field.onChange}
              disabled={field.disabled ?? false}
            >
              {item.label}
            </Checkbox>
          )}
        />
      );
    case 'select':
      return (
        <Select {...props}>
          {item.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case 'number':
      return <NumberInput {...props} min={1} max={1000} step={1} />;
    case 'quill':
      return (
        <Controller
          control={control}
          name={item.value as string}
          render={({ field }) => <Quill {...field} />}
        />
      );
    default:
      return <Input {...props} />;
  }
}

export default function GenericEntryForm({
  childrenIndex,
  children,
  defaultValues,
  formFields,
  isSubmitButtonDisabled = false,
  onSubmit,
}: GenericEntryFormProps) {
  const { control, handleSubmit, register } = useForm({
    defaultValues: defaultValues || undefined,
  });
  const loaders = useAtomValue(loaderAtom);
  const sheet = useEntryFormSheet();

  // Inside the entry sheet, Save sits in the sheet's footer.
  useEffect(() => {
    sheet?.setSubmitDisabled(isSubmitButtonDisabled);
  }, [sheet, isSubmitButtonDisabled]);

  // The fields in their written order, the children in at childrenIndex,
  // then split by area; each column keeps that order.
  const columns: Record<FormArea, React.ReactNode[]> = { main: [], side: [] };
  const placeChildren = () =>
    flattenChildren(children).forEach((child) =>
      columns[childArea(child)].push(child)
    );
  formFields.forEach((item, index) => {
    if (index === childrenIndex) placeChildren();
    columns[itemArea(item)].push(
      <Box
        key={String(item.value)}
        className={
          LEAD_FIELDS.has(String(item.value)) ? 'entry-form-lead' : undefined
        }
        w="100%"
      >
        <FormField
          {...item.props}
          helper={item.helper}
          asHeading={item.asHeading}
          helperInline={item.helperInline}
          label={item.label}
          optional={item.optional}
        >
          <FieldItemHandler control={control} item={item} register={register} />
        </FormField>
      </Box>
    );
  });
  if (childrenIndex === undefined || childrenIndex >= formFields.length) {
    placeChildren();
  }

  return (
    <>
      <form id={sheet?.formId} onSubmit={handleSubmit(onSubmit)}>
        <div
          className="entry-form-grid"
          data-columns={columns.side.length > 0 ? 'two' : 'one'}
        >
          <div className="entry-form-main">{columns.main}</div>
          {columns.side.length > 0 && (
            <div className="entry-form-side">{columns.side}</div>
          )}
        </div>

        {!sheet && (
          <Flex justify="flex-end" mt="8" mb="12">
            <Button
              disabled={isSubmitButtonDisabled}
              loading={loaders?.isCreating}
              type="submit"
            >
              <Trans i18nKey="common:actions.submit">Submit</Trans>
            </Button>
          </Flex>
        )}
      </form>
    </>
  );
}
