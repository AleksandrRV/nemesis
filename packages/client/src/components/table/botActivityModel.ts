import type { EngineAction } from '@nemesis/shared';

export function botActionLabel(action: EngineAction): string {
  switch (action.type) {
    case 'ACTION_PASS':
      return 'пасует';
    case 'ACTION_ESCAPE_POD':
      return 'остаётся в Спасательной Капсуле';
    case 'ACTION_RESOLVE_DECISION':
      return 'принимает решение';
    default:
      return 'действует';
  }
}
