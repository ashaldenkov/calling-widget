import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';

import { TextField } from '../ui';

export interface CommentFieldHandle {
  getValue: () => string;
}

interface CommentFieldProps {
  maxLength: number;
  onValidityChange: (isInvalid: boolean) => void;
}

const CommentField = forwardRef<CommentFieldHandle, CommentFieldProps>(
  ({ maxLength, onValidityChange }, ref) => {
    const [value, setValue] = useState('');
    const isTooLong = value.length > maxLength;
    const prevInvalidRef = useRef(false);

    useImperativeHandle(ref, () => ({ getValue: () => value }), [value]);

    useEffect(() => {
      if (prevInvalidRef.current !== isTooLong) {
        prevInvalidRef.current = isTooLong;
        onValidityChange(isTooLong);
      }
    }, [isTooLong, onValidityChange]);

    return (
      <TextField
        label='Comment'
        placeholder='Type your comment'
        value={value}
        onInput={(e) => setValue(e.currentTarget.value)}
        error={isTooLong}
        helperText={isTooLong ? 'Too long' : undefined}
        multiline
        minRows={1}
        maxRows={4}
        fullWidth
      />
    );
  },
);

export default CommentField;
