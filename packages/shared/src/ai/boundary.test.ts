import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const PROBE_PATH = 'packages/shared/src/ai/boundaryProbe.ts';

async function restrictedImports(code: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const [result] = await eslint.lintText(code, { filePath: PROBE_PATH });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
}

describe('Граница честности ботов (план 0.8.0, В8-5-1)', () => {
  it.each([
    ['движок', "import { GameEngine } from '../logic/fsm.js';\nexport const engine = GameEngine;\n"],
    [
      'фильтр среза',
      "import { filterStateForPlayer } from '../logic/sanitizer.js';\nexport const f = filterStateForPlayer;\n",
    ],
    [
      'подготовка стола',
      "import { createInitialGameState } from '../logic/setup.js';\nexport const s = createInitialGameState;\n",
    ],
    ['полный GameState', "import type { GameState } from '../types/state.js';\nexport type S = GameState;\n"],
    [
      'тестовые фикстуры',
      "import { contactState } from '../testing/contactFixtures.js';\nexport const c = contactState;\n",
    ],
  ])(
    'линтер отклоняет импорт: %s',
    async (_name, code) => {
      expect(await restrictedImports(code)).toHaveLength(1);
    },
    20_000,
  );

  it('срез, типы, данные, утилиты и чистые запросы разрешены', async () => {
    const code = [
      "import type { SanitizedGameState } from '../types/sanitized.js';",
      "import type { EngineNumber } from '../types/state.js';",
      "import { COORDINATE_CARDS } from '../data/coordinateCards.js';",
      "import { createRng } from '../utils/rng.js';",
      "import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';",
      "import { podCommandsFor } from '../logic/podQueries.js';",
      'export type Probe = [SanitizedGameState, EngineNumber];',
      'export const probe = [COORDINATE_CARDS, createRng, findAdjacentOpenRoomIds, podCommandsFor];',
      '',
    ].join('\n');
    expect(await restrictedImports(code)).toEqual([]);
  }, 20_000);
});
