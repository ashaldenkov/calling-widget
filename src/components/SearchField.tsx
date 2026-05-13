import { useState } from 'preact/hooks';

import { CancelIcon, SearchIcon } from '../assets/icons';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { IconButton, TextField } from '../ui';

interface SearchFieldProps {
  onChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
}

const SearchField = ({
  onChange,
  debounceMs = 250,
  placeholder = 'Search',
}: SearchFieldProps) => {
  const [value, setValue] = useState('');
  const debouncedChange = useDebouncedCallback(onChange, debounceMs);
  const commit = debounceMs > 0 ? debouncedChange : onChange;

  const handleClear = () => {
    setValue('');
    if (debounceMs > 0) debouncedChange.flush('');
    else onChange('');
  };

  return (
    <TextField
      fullWidth
      placeholder={placeholder}
      value={value}
      onInput={(e) => {
        const next = e.currentTarget.value;
        setValue(next);
        commit(next);
      }}
      startAdornment={<SearchIcon size={18} />}
      endAdornment={
        value ? (
          <IconButton
            size='small'
            onClick={handleClear}
            style={{ color: 'var(--cw-text-tertiary)' }}
          >
            <CancelIcon size={24} />
          </IconButton>
        ) : null
      }
    />
  );
};

export default SearchField;
