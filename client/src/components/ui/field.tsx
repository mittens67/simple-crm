import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import './field.scss';

interface FieldShellProps {
  label: string;
  /** Marks the control required and shows the asterisk. */
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
    required: boolean | undefined;
  }) => ReactNode;
}

/**
 * The label/error/hint wiring, done once.
 *
 * Every form in the app previously used a bare `<label>` with no `htmlFor`, so
 * clicking the label did nothing and screen readers could not associate it with
 * its input. There was also no per-field error display at all — validation was
 * native `required` plus a blocking alert dialog.
 *
 * `useId` generates the matching ids, and the error is linked with
 * `aria-describedby` so it is announced rather than only seen.
 */
export const Field = ({ label, required, error, hint, children }: FieldShellProps) => {
  const id = useId();
  const error_id = `${id}-error`;
  const hint_id = `${id}-hint`;

  const described_by = [error ? error_id : null, hint ? hint_id : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`ui-field${error ? ' ui-field-invalid' : ''}`}>
      <label className="ui-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="ui-field-required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': described_by || undefined,
        required: required || undefined,
      })}

      {hint && !error && (
        <p className="ui-field-hint" id={hint_id}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ui-field-error" id={error_id} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

type ControlProps = { label: string; error?: string | null; hint?: string };

export const Input = ({
  label,
  error,
  hint,
  required,
  ...rest
}: ControlProps & InputHTMLAttributes<HTMLInputElement>) => (
  <Field label={label} error={error} hint={hint} required={required}>
    {(field) => <input className="ui-input" {...field} {...rest} />}
  </Field>
);

export const Textarea = ({
  label,
  error,
  hint,
  required,
  rows = 3,
  ...rest
}: ControlProps & TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <Field label={label} error={error} hint={hint} required={required}>
    {(field) => <textarea className="ui-input ui-textarea" rows={rows} {...field} {...rest} />}
  </Field>
);

interface SelectOption {
  value: string;
  label: string;
}

export const Select = ({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  ...rest
}: ControlProps & { options: SelectOption[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) => (
  <Field label={label} error={error} hint={hint} required={required}>
    {(field) => (
      <select className="ui-input ui-select" {...field} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </Field>
);

/** Checkboxes put the label after the control, so they do not use Field. */
export const Checkbox = ({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) => {
  const id = useId();
  return (
    <div className="ui-checkbox">
      <input id={id} type="checkbox" {...rest} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
};
