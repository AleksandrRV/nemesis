import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionNoticeView } from './SessionNotice';

describe('Сообщение о несовместимом сохранении', () => {
  it('объявляется диктору и закрывается кнопкой', () => {
    const html = renderToStaticMarkup(
      <SessionNoticeView notice="Сохранение от предыдущей версии — начата новая партия." onDismiss={() => undefined} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Сохранение от предыдущей версии — начата новая партия.');
    expect(html).toContain('aria-label="Закрыть сообщение"');
  });
});
