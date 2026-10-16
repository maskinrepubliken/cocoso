import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Input, Select, Text, Textarea } from '/imports/ui/core';

// Controls the label can point at by id. Richer children (editors, groups
// of checkboxes) keep their own labelling.
const LABELABLE = new Set<unknown>([
  Input,
  Select,
  Textarea,
  'input',
  'select',
  'textarea',
]);

export interface FormFieldProps extends React.ComponentProps<typeof Box> {
  // Read by GenericEntryForm to place the field in a column.
  area?: 'main' | 'side';
  children?: React.ReactNode;
  errorMessage?: string | null;
  helper?: string | React.ReactNode;
  label?: string | React.ReactNode;
  // Required fields are not marked; optional ones say so after the label.
  required?: boolean;
  optional?: boolean;
  // The helper on the label's line, when both are short
  helperInline?: boolean;
  // A section of its own in the form: the label as a heading, like a
  // card's (Bilder, Tillfällen beside Arrangör, Plats)
  asHeading?: boolean;
}

export default function FormField(props: FormFieldProps) {
  const {
    area: _area,
    children,
    errorMessage = null,
    helper,
    label,
    required: _required,
    optional = false,
    helperInline = false,
    asHeading = false,
    ...otherProps
  } = props;
  // A single input, select or textarea child gets an id so the label
  // points at it.
  const generatedId = useId();
  const [tc] = useTranslation('common');
  const optionalNote = optional && (
    <span className="form-field-optional"> ({tc('forms.optional')})</span>
  );
  const child =
    React.Children.count(children) === 1 && React.isValidElement(children)
      ? (children as React.ReactElement<any>)
      : null;
  const labelable = Boolean(child && LABELABLE.has(child.type));
  const controlId = labelable ? child!.props.id || generatedId : undefined;
  const control =
    labelable && !child!.props.id
      ? React.cloneElement(child!, { id: controlId })
      : children;

  const labelNode = asHeading ? (
    <h3 className="form-card-title form-field-heading">
      {label}
      {optionalNote}
    </h3>
  ) : controlId ? (
    <label className="form-field-label" htmlFor={controlId}>
      {label}
      {optionalNote}
    </label>
  ) : (
    <Text className="form-field-label" color="gray.800" fontWeight="bold">
      {label}
      {optionalNote}
    </Text>
  );
  const helperNode = helper && (
    <Box>
      <Text color="gray.600" fontSize="sm">
        {helper}
      </Text>
    </Box>
  );

  return (
    <Box my="4" w="100%" {...otherProps}>
      {helperInline ? (
        <div className="form-field-head">
          <Box>{labelNode}</Box>
          {helperNode}
        </div>
      ) : (
        <>
          <Box>{labelNode}</Box>
          {helperNode}
        </>
      )}

      <Box pt="2">{control}</Box>

      {errorMessage && (
        <Box mt="1">
          <Text color="red.500">{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}
