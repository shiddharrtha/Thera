import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

type WebVideoFileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFileSelected: (file: globalThis.File | null) => void;
};

/** Hidden file input for choosing scan videos in the browser. */
export function WebVideoFileInput({ inputRef, onFileSelected }: WebVideoFileInputProps) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="file"
      accept="video/mp4,video/quicktime,video/webm,video/*"
      style={{ display: 'none' }}
      onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        if (mountedRef.current) {
          onFileSelected(file);
        }
        event.target.value = '';
      }}
    />
  );
}
