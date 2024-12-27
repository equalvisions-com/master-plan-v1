declare module 'react-debounce-input' {
  import { InputHTMLAttributes } from 'react';
  
  export interface DebounceInputProps extends InputHTMLAttributes<HTMLInputElement> {
    debounceTimeout?: number;
    forceNotifyByEnter?: boolean;
    forceNotifyOnBlur?: boolean;
    minLength?: number;
    value?: string | number;
    element?: React.ElementType;
  }
  
  export const DebounceInput: React.FC<DebounceInputProps>;
} 