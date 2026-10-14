import React from 'react';

/** Файл арта не загрузился — компонент возвращается к векторному виду: значку класса в его цвете. */
export function useArtFallback(src: string): { failed: boolean; onError: () => void } {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  return { failed: failedSrc === src, onError: () => setFailedSrc(src) };
}
