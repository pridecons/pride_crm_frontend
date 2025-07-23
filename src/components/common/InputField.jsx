// FormComponents.tsx
import React, { ChangeEvent, FocusEvent } from 'react';

/** A standard text‐based input */
export const InputField = ({
  label="",
  name="",
  id=0,
  value = '',
  setValue = () => {},
  placeholder,
  labelCss = '',
  className = '',
  inputCss = '',
  type = 'text',
  disabled = false,
  required = false,
  helpText="",
  errorMessage="",
}) => (
  <div className={className}>
    {label && (
      <label htmlFor={id || name} className={`block text-sm font-medium mb-1 ${labelCss}`}>
        {label}{required && ' *'}
      </label>
    )}
    <input
      id={id || name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder || (label ? `Enter ${label}` : undefined)}
      disabled={disabled}
      required={required}
      className={`w-full border-gray-300 border-2 rounded-lg p-2 focus:ring-blue-500 focus:border-transparent ${inputCss}`}
    />
    {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
  </div>
);

/** A dropdown button that shows a list of checkboxes */
export const DropdownCheckboxButton = ({
  label="",
  name="",
  id=0,
  value = '',
  setValue = () => {},
  options = [],
  labelCss = '',
  className = '',
  inputCss = '',
  disabled = false,
}) => {
  const dropdownId = id || name || 'dropdownCheckboxButton';
  const listId = `${dropdownId}-list`;

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium mb-1 ${labelCss}`}>
          {label}
        </label>
      )}
      <button
        id={dropdownId}
        data-dropdown-toggle={listId}
        type="button"
        disabled={disabled}
        className={`inline-flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring ${inputCss}`}
      >
        {value || 'Select…'}
        <svg className="w-4 h-4 ms-2" aria-hidden="true" fill="none" viewBox="0 0 10 6">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
        </svg>
      </button>

      <div
        id={listId}
        className="hidden z-10 mt-2 w-48 bg-white divide-y divide-gray-100 rounded-lg shadow-sm"
      >
        <ul className="p-3 space-y-2 text-sm text-gray-700">
          {options.map(opt => (
            <li key={opt.value}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={value.split(',').includes(opt.value)}
                  onChange={(e) => {
                    const vals = new Set(value.split(',').filter(v => v));
                    if (e.target.checked) vals.add(opt.value);
                    else vals.delete(opt.value);
                    setValue(Array.from(vals).join(','));
                  }}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring"
                />
                <span className="ms-2">{opt.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
