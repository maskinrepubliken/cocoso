import React, { useId } from 'react';

import { Box, Input, Select, Text, Textarea } from '/imports/ui/core';

// Controls the label can point at by id. Richer children (editors, groups
// of checkboxes) keep their own labelling.
const LABELABLE = new Set<unknown>([Input, Select, Textarea, 'input', 'select', 'textarea']);

export interface FormFieldProps extends React.ComponentProps<typeof Box> {
  children?: React.ReactNode;
  errorMessage?: string | null;
  helper?: string | React.ReactNode;
  label?: string | React.ReactNode;
  required?: boolean;
}

export default function FormField(props: FormFieldProps) {
  const {
    children,
    errorMessage = null,
    helper,
    label,
    required = false,
    ...otherProps
  } = props;
  // A single input, select or textarea child gets an id so the label
  // points at it.
  const generatedId = useId();
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

  return (
    <Box my="4" w="100%" {...otherProps}>
      <Box>
        {controlId ? (
          <label className="form-field-label" htmlFor={controlId}>
            {label}
            {required && ' *'}
          </label>
        ) : (
          <Text color="gray.800" fontWeight="bold">
            {label}
            {required && ' *'}
          </Text>
        )}
      </Box>
      {helper && (
        <Box>
          <Text color="gray.600" fontSize="sm">
            {helper}
          </Text>
        </Box>
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
