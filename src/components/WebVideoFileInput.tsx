import type { RefObject } from 'react';

type WebVideoFileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File | null) => void;
};

export function WebVideoFileInput(_props: WebVideoFileInputProps) {
  return null;
}
