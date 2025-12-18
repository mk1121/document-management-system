import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value);

  // Helper: ISO (YYYY-MM-DD) -> Display (DD/MM/YYYY)
  const formatToDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso; // Fallback if not valid ISO
    return `${d}/${m}/${y}`;
  };

  // Helper: Display (DD/MM/YYYY) -> ISO (YYYY-MM-DD)
  const parseToISO = (display: string) => {
    // Allow various separators or just /
    const parts = display.split(/[/.-]/);
    if (parts.length !== 3) return null;

    let [d, m, y] = parts;

    // Auto-pad
    if (d.length === 1) d = '0' + d;
    if (m.length === 1) m = '0' + m;

    // year handling
    if (y.length === 2) y = '20' + y; // Assumption for 2-digit year

    if (isNaN(Number(d)) || isNaN(Number(m)) || isNaN(Number(y))) return null;

    return `${y}-${m}-${d}`;
  };

  // Sync prop value to display value (external updates)
  useEffect(() => {
    if (type === 'date') {
      const formatted = formatToDisplay(value);

      if (document.activeElement !== textInputRef.current) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayValue(formatted);
      } else {
        const currentParsed = parseToISO(displayValue);
        if (currentParsed !== value) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDisplayValue(formatted);
        }
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, type]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;

    if (type === 'date') {
      const digits = newVal.replace(/\D/g, '');
      const isDeleting = newVal.length < displayValue.length;

      let formatted = digits;
      if (digits.length >= 2) {
        formatted = digits.slice(0, 2) + '/';
        if (digits.length > 2) {
          formatted += digits.slice(2, 4);
          if (digits.length >= 4) {
            formatted += '/';
          }
          if (digits.length > 4) {
            formatted += digits.slice(4, 8);
          }
        }
      }

      if (isDeleting && formatted.endsWith('/')) {
        formatted = formatted.slice(0, -1);
      }

      setDisplayValue(formatted);
      newVal = formatted;

      const iso = parseToISO(newVal);
      if (iso && !iso.includes('undefined')) {
        // Check basic validity
        const date = new Date(iso);
        const num = date.getTime();
        if (!isNaN(num)) {
          // Create synthetic event
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: iso },
          };
          onChange(syntheticEvent);
          return;
        }
      }

      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: '' },
      };
      onChange(syntheticEvent);
    } else {
      setDisplayValue(newVal);
      onChange(e);
    }
  };

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      if ('showPicker' in dateInputRef.current) {
        (dateInputRef.current as any).showPicker();
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  return (
    <div className='mb-4'>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
        {label} {required && <span className='text-red-500'>*</span>}
      </label>
      <div className='relative'>
        <input
          ref={textInputRef}
          type={type === 'date' ? 'text' : type}
          inputMode={type === 'date' ? 'numeric' : undefined}
          value={displayValue}
          onChange={handleTextChange}
          placeholder={type === 'date' ? 'DD/MM/YYYY' : placeholder}
          className={`appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-oracle-500 focus:border-oracle-500 dark:bg-gray-700 dark:text-white sm:text-sm ${type === 'date' ? 'pr-10' : ''
            }`}
        />
        {type === 'date' && (
          <>
            <button
              type='button'
              onClick={handleCalendarClick}
              className='absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-oracle-500 cursor-pointer'
            >
              <Calendar size={18} />
            </button>
            <input
              type='date'
              ref={dateInputRef}
              onChange={onChange} // This fires standard ISO YYYY-MM-DD
              className='absolute opacity-0 bottom-0 left-0 w-0 h-0 pointer-events-none'
              tabIndex={-1}
              value={value}
            />
          </>
        )}
      </div>
    </div>
  );
};
