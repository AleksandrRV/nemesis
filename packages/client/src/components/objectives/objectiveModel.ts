import type { ObjectiveCard, ObjectiveKind, SanitizedGameState, SanitizedPlayerState } from '@nemesis/shared';

export const OBJECTIVE_KIND_LABELS: Record<ObjectiveKind, string> = {
  PERSONAL: 'Личная',
  CORPORATE: 'Корпоративная',
  SOLO_COOP: 'Соло/Кооп',
};

export interface ObjectiveTheme {
  frame: string;
  glow: string;
  accent: string;
  flavor: string;
  divider: string;
  art: string;
}

export const OBJECTIVE_THEMES: Record<ObjectiveKind, ObjectiveTheme> = {
  PERSONAL: {
    frame: 'border-sky-400/80',
    glow: 'shadow-[0_0_28px_rgba(56,189,248,0.35)]',
    accent: 'text-sky-300',
    flavor: 'text-sky-200/90',
    divider: 'bg-sky-400 text-slate-950',
    art: 'bg-[radial-gradient(120%_80%_at_50%_120%,#fdba74_0%,#ea580c_50%,#7dd3fc_60%,#0369a1_67%,#0c4a6e_76%,#020617_100%)]',
  },
  CORPORATE: {
    frame: 'border-amber-400/80',
    glow: 'shadow-[0_0_28px_rgba(251,191,36,0.35)]',
    accent: 'text-amber-300',
    flavor: 'text-amber-200/90',
    divider: 'bg-amber-400 text-slate-950',
    art: 'bg-[repeating-linear-gradient(115deg,rgba(251,191,36,0.22)_0px,rgba(251,191,36,0.22)_2px,transparent_2px,transparent_22px),radial-gradient(90%_70%_at_30%_30%,#134e4a_0%,#0f172a_55%,#020617_100%)]',
  },
  SOLO_COOP: {
    frame: 'border-fuchsia-400/80',
    glow: 'shadow-[0_0_28px_rgba(232,121,249,0.35)]',
    accent: 'text-fuchsia-300',
    flavor: 'text-fuchsia-100/80',
    divider: 'bg-fuchsia-400 text-slate-950',
    art: 'bg-[#0b0620] bg-[radial-gradient(40%_45%_at_30%_40%,rgba(217,70,239,0.6)_0%,transparent_70%),radial-gradient(45%_50%_at_72%_60%,rgba(99,102,241,0.55)_0%,transparent_70%),radial-gradient(circle_at_20%_20%,#fff_0.8px,transparent_1.6px),radial-gradient(circle_at_65%_30%,#fff_0.8px,transparent_1.6px),radial-gradient(circle_at_85%_75%,#fff_0.8px,transparent_1.6px)]',
  },
};

export function viewerPlayer(view: SanitizedGameState): SanitizedPlayerState | null {
  return Object.values(view.players).find((player) => player.objectives !== null) ?? null;
}

export function viewerObjectives(view: SanitizedGameState): ObjectiveCard[] {
  return viewerPlayer(view)?.objectives ?? [];
}

export type ObjectiveStage = 'AWAITING_FIRST_CONTACT' | 'CHOOSING' | 'COMMITTED';

export function objectiveStage(view: SanitizedGameState): ObjectiveStage {
  const objectives = viewerObjectives(view);
  if (objectives.length <= 1) return 'COMMITTED';
  return view.intrudersPool.firstEncounterOccurred ? 'CHOOSING' : 'AWAITING_FIRST_CONTACT';
}

export const OBJECTIVE_STAGE_HINTS: Record<ObjectiveStage, string> = {
  AWAITING_FIRST_CONTACT:
    'Когда на поле впервые появится миниатюра Чужого, игра встанет на паузу: оставьте одну Цель, вторая уйдёт из игры лицом вниз.',
  CHOOSING: 'Первый Контакт: выберите, какую Цель оставить.',
  COMMITTED: 'Цель выбрана. Для победы выполните её и выживите.',
};

/** «Игрок N» на Корпоративных Целях — Номер Персонажа (стр. 8, шаг 14). */
export function playerNumberHint(view: SanitizedGameState, condition: string): string | null {
  const match = /Персонаж Игрока (\d)/.exec(condition);
  if (!match) return null;
  const target = Object.values(view.players).find((player) => player.orderNumber === Number(match[1]));
  return target ? `Игрок ${match[1]} — ${target.name}` : `Игрока ${match[1]} в этой партии нет`;
}

export const OBJECTIVE_BRIEFING_STORAGE_PREFIX = 'nemesis:objective-briefing:';

export function isBriefingDismissed(gameId: string): boolean {
  try {
    return window.sessionStorage.getItem(`${OBJECTIVE_BRIEFING_STORAGE_PREFIX}${gameId}`) === '1';
  } catch {
    return false;
  }
}

export function rememberBriefingDismissed(gameId: string): void {
  try {
    window.sessionStorage.setItem(`${OBJECTIVE_BRIEFING_STORAGE_PREFIX}${gameId}`, '1');
  } catch {
    return;
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
