import React from 'react';

interface UseFocusTrapOptions {
  /**
   * Что делать по Escape. Не передан — Escape блокируется и фокус
   * остаётся внутри (обязательные решения движка нельзя закрыть клавишей).
   */
  onEscape?: () => void;
}

/**
 * Фокус-трап для модальных окон: Tab/Shift+Tab циклятся по фокусируемым
 * элементам контейнера, при открытии фокус ставится на первый элемент
 * (Шаг 7, долг 24: доступность модалок).
 *
 * Вынесен из DecisionModal (общий для всех модалок проекта).
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {},
): void {
  const { onEscape } = options;
  // Свежий колбэк без перезапуска эффекта: список фокусируемых элементов
  // собирается один раз на монтирование контейнера.
  const onEscapeRef = React.useRef(onEscape);
  onEscapeRef.current = onEscape;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            (last as HTMLElement)?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            (first as HTMLElement)?.focus();
          }
        }
      }
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          // Окно можно закрыть: гасим событие, чтобы его не поймали нижележащие слои.
          e.preventDefault();
          e.stopPropagation();
          onEscapeRef.current();
          return;
        }
        // Обязательные решения нельзя закрыть Esc — предотвращаем всплытие и сохраняем фокус внутри модалки
        e.preventDefault();
        e.stopPropagation();
        first?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown as never);
    return () => container.removeEventListener('keydown', handleKeyDown as never);
  }, [containerRef]);
}
