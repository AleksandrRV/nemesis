import { builtinModules } from 'node:module';

import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

/**
 * ВАЖНО О СЕМАНТИКЕ ПРАВИЛА no-restricted-imports.
 *
 * `paths` — точное совпадение спецификатора импорта, `patterns` — глобы в стиле
 * .gitignore, которые сопоставляются с сегментами пути. Поэтому баны «по имени
 * модуля» описаны через `paths`: глоб вида `inspector` заблокировал бы и
 * совершенно невинный относительный импорт `./components/inspector/RoomInspector`.
 * Глобы оставлены только там, где нужно запретить подпути (например,
 * `@nemesis/shared/*`).
 */

/** Точные спецификаторы встроенных модулей Node.js, включая подпути (fs/promises). */
const NODE_BUILTIN_SPECIFIERS = [
  ...new Set(
    builtinModules
      .filter((name) => !name.startsWith('_'))
      .flatMap((name) => {
        const bare = name.replace(/^node:/, '');
        return [bare, `node:${bare}`];
      }),
  ),
];

/** UI-зависимости, недопустимые в изоморфном ядре. */
const UI_SPECIFIERS = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  'react-dom/test-utils',
  'react-zoom-pan-pinch',
  'lucide-react',
  '@types/react',
  '@types/react-dom',
];

/** Клиентские менеджеры состояния — ядро не должно знать о слое UI. */
const CLIENT_STORE_SPECIFIERS = [
  'zustand',
  'zustand/vanilla',
  'zustand/react',
  'zustand/middleware',
  'zustand/middleware/immer',
  'zustand/shallow',
  'zustand/traditional',
];

/** Сетевой слой — задача транспорта, а не правил. */
const NETWORK_SPECIFIERS = [
  'socket.io',
  'socket.io-client',
  'socket.io-parser',
  'socket.io-adapter',
  'engine.io',
  'engine.io-client',
  'engine.io-parser',
  'express',
];

/** Запрет обратных зависимостей между пакетами монорепозитория. */
const CROSS_PACKAGE_SPECIFIERS = ['@nemesis/client', '@nemesis/server'];

const CROSS_PACKAGE_PATTERNS = ['@nemesis/client/*', '@nemesis/server/*'];

/** DOM API: ядро должно исполняться и в Node.js, и в браузере (AGENTS.md §2.1). */
const DOM_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'location',
  'XMLHttpRequest',
  'HTMLElement',
  'Element',
  'alert',
  'confirm',
  'prompt',
  'requestAnimationFrame',
];

/** Node.js API в глобальной области: ядро не должно зависеть от среды исполнения. */
const NODE_GLOBALS = [
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'process',
  'Buffer',
  'global',
  'setImmediate',
];

/** Разворачивает список имён модулей в формат `paths` с общим сообщением. */
const restrict = (names, message) => names.map((name) => ({ name, message }));

const MESSAGES = {
  ui: 'packages/shared — изоморфное ядро: React, DOM и UI-библиотеки запрещены (AGENTS.md §2.1).',
  store: 'packages/shared не должен знать о слое UI: состояние принадлежит ядру, а не клиентскому стору.',
  network: 'packages/shared не должен работать с сетью: транспортом занимается клиент или сервер (tech_stack §5).',
  crossPackage: 'Ядро не может зависеть от пакетов, которые зависят от ядра: разрешён только @nemesis/shared.',
  node: 'packages/shared обязан исполняться и в браузере: встроенные модули Node.js запрещены (AGENTS.md §2.1).',
  domGlobal: 'packages/shared — изоморфное ядро: обращение к DOM запрещено (AGENTS.md §2.1).',
  nodeGlobal: 'packages/shared — изоморфное ядро: глобальные API Node.js запрещены (AGENTS.md §2.1).',
  fetch: 'Ядро правил должно быть чистым: сетевой ввод-вывод — ответственность транспорта.',
  sharedDeepImport:
    'Импортируйте ядро только через точку входа @nemesis/shared: внутренняя структура пакета не является публичным API.',
  clientNode:
    'Клиент исполняется в браузере: встроенные модули Node.js недоступны (они допустимы только в конфигах сборки).',
  clientCrossPackage: 'Клиент не может импортировать другие пакеты приложения напрямую.',
};

export default tseslint.config(
  {
    name: 'nemesis/ignores',
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/*.d.ts'],
  },

  // Базовый набор для любого JavaScript в репозитории (конфиги Vite/PostCSS/Tailwind).
  { name: 'nemesis/js-recommended', ...js.configs.recommended },

  // Строгие правила TypeScript для .ts/.tsx.
  ...tseslint.configs.recommended,

  {
    name: 'nemesis/typescript',
    files: TS_FILES,
    rules: {
      // Области видимости и неиспользуемые сущности проверяет сам TypeScript,
      // поэтому базовое правило отключается в пользу TS-версии.
      'no-unused-vars': 'off',

      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',

      // AGENTS.md §4.1: «Запрещён тип any».
      '@typescript-eslint/no-explicit-any': 'error',

      // Типы импортируются только через import type — это убирает
      // рантайм-импорты типов и делает граф зависимостей честным.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // AGENTS.md §4.3: «Никакого Math.random() в логике правил».
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'AGENTS.md §4.3: Math.random() запрещён — используйте детерминированный RNG (seedrandom).',
        },
      ],
    },
  },

  // AGENTS.md §3.2: файл держится в пределах 500 строк; превышение 1000 строк —
  // немедленный рефакторинг на логические блоки.
  {
    name: 'nemesis/file-size',
    files: TS_FILES,
    rules: {
      'max-lines': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },

  // Архитектурная граница: packages/shared — изоморфное ядро без UI и Node.js.
  // Ограничения действуют на поставляемый код ядра; тесты и конфиги сборки
  // живут по правилам среды исполнения и разбираются отдельным блоком ниже.
  {
    name: 'nemesis/shared-isomorphic-core',
    files: ['packages/shared/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...restrict(UI_SPECIFIERS, MESSAGES.ui),
            ...restrict(CLIENT_STORE_SPECIFIERS, MESSAGES.store),
            ...restrict(NETWORK_SPECIFIERS, MESSAGES.network),
            ...restrict(CROSS_PACKAGE_SPECIFIERS, MESSAGES.crossPackage),
            ...restrict(NODE_BUILTIN_SPECIFIERS, MESSAGES.node),
          ],
          patterns: [{ group: CROSS_PACKAGE_PATTERNS, message: MESSAGES.crossPackage }],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...DOM_GLOBALS.map((name) => ({ name, message: MESSAGES.domGlobal })),
        ...NODE_GLOBALS.map((name) => ({ name, message: MESSAGES.nodeGlobal })),
        { name: 'fetch', message: MESSAGES.fetch },
      ],
    },
  },

  // Клиент: правила React и корректность Fast Refresh.
  {
    name: 'nemesis/client-react',
    files: ['packages/client/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    name: 'nemesis/client-react-refresh',
    files: ['packages/client/src/**/*.tsx'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Клиент обращается к ядру только через точку входа пакета.
  // Правило покрывает только браузерный код: конфиги сборки (vite.config.ts)
  // законно используют Node.js API.
  {
    name: 'nemesis/client-package-boundaries',
    files: ['packages/client/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...restrict(NODE_BUILTIN_SPECIFIERS, MESSAGES.clientNode),
            ...restrict(CROSS_PACKAGE_SPECIFIERS, MESSAGES.clientCrossPackage),
          ],
          patterns: [
            {
              group: ['@nemesis/shared/*', '**/shared/src/**'],
              message: MESSAGES.sharedDeepImport,
            },
            { group: CROSS_PACKAGE_PATTERNS, message: MESSAGES.clientCrossPackage },
          ],
        },
      ],
    },
  },

  // Тесты не входят в поставляемое ядро: им доступны Node.js API и глобальные
  // объекты среды исполнения, но архитектурные запреты на UI и сеть сохраняются.
  {
    name: 'nemesis/shared-tests',
    files: [
      'packages/shared/**/*.{test,spec}.{ts,tsx}',
      'packages/shared/**/__tests__/**/*.{ts,tsx}',
      'packages/shared/**/testing/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...restrict(UI_SPECIFIERS, 'Тесты ядра не должны тянуть UI-зависимости.'),
            ...restrict(NETWORK_SPECIFIERS, 'Тесты ядра не должны работать с сетью.'),
          ],
        },
      ],
      'no-restricted-globals': 'off',
    },
  },

  // Отключает правила, конфликтующие с форматированием Prettier. Должен идти последним.
  { name: 'nemesis/prettier-compat', ...prettierConfig },
);
