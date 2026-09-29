import {
  getSanitizedPlayerHandLimit,
  mustDropHeavyForArmWound,
  type SanitizedGameState,
  type SanitizedPlayerState,
} from '@nemesis/shared';

export const LIGHT_WOUND_LIMIT = 2;
export const SERIOUS_WOUND_LIMIT = 3;
export const HAND_SLOT_COUNT = 2;
const ACTIONS_PER_TURN = 2;

export type BoardTab = 'CARDS' | 'GEAR' | 'QUESTS' | 'OBJECTIVES' | 'VITALS';

export type StatusTone = 'active' | 'muted' | 'danger' | 'warning' | 'toxic';

export interface BoardStatus {
  id: string;
  label: string;
  hint: string;
  tone: StatusTone;
}

export interface ActionMeter {
  used: number;
  limit: number | null;
}

export interface VitalsSummary {
  light: number;
  serious: number;
  treated: number;
  untreated: number;
  isCritical: boolean;
}

export interface ContaminationSummary {
  total: number;
  scanned: number;
  infected: number;
}

export interface PlayerBoardSummary {
  handCount: number;
  handLimit: number;
  drawPileCount: number;
  discardCount: number;
  canAct: boolean;
  actions: ActionMeter;
  vitals: VitalsSummary;
  contamination: ContaminationSummary;
  statuses: BoardStatus[];
  inventoryCount: number;
  occupiedHandSlots: number;
}

export function contaminationSummary(player: SanitizedPlayerState): ContaminationSummary {
  const cards = player.actionDeck.hand.filter((card) => !('characterClass' in card));
  return {
    total: cards.length,
    scanned: cards.filter((card) => 'isScanned' in card && card.isScanned).length,
    infected: cards.filter((card) => 'isInfected' in card && card.isInfected === true).length,
  };
}

export function vitalsSummary(player: SanitizedPlayerState): VitalsSummary {
  const treated = player.seriousWounds.filter((wound) => wound.isTreated).length;
  const serious = player.seriousWounds.length;
  return {
    light: player.lightWounds,
    serious,
    treated,
    untreated: serious - treated,
    isCritical: serious >= SERIOUS_WOUND_LIMIT,
  };
}

export function boardStatuses(
  view: SanitizedGameState,
  player: SanitizedPlayerState,
  inCombat: boolean,
): BoardStatus[] {
  const statuses: BoardStatus[] = [];
  const isActive = view.meta.activePlayerId === player.id && view.meta.phase === 'PLAYER_PHASE';
  if (player.hasPassed)
    statuses.push({ id: 'PASSED', label: 'Пас', hint: 'Вы спасовали до конца раунда', tone: 'muted' });
  else if (isActive) statuses.push({ id: 'TURN', label: 'Ваш ход', hint: 'Можно выполнять Действия', tone: 'active' });
  if (inCombat) statuses.push({ id: 'COMBAT', label: 'Бой', hint: 'В вашем отсеке Чужие (стр. 19)', tone: 'danger' });
  if (player.hasAdrenalineRush) {
    statuses.push({ id: 'ADRENALINE', label: 'Адреналин', hint: 'Без лимита Действий до Паса', tone: 'warning' });
  }
  if (player.boardedPodId) {
    statuses.push({
      id: 'POD',
      label: 'В Капсуле',
      hint: 'Ждёт в Спасательной Капсуле: запустить, выйти или спасовать',
      tone: 'warning',
    });
  }
  if (mustDropHeavyForArmWound(player)) {
    statuses.push({
      id: 'HEAVY_DROP',
      label: 'Бросьте Тяжёлый',
      hint: '«Травма руки»: остался 1 слот руки — сначала бросьте один Тяжёлый Предмет/Объект',
      tone: 'danger',
    });
  }
  if (player.hasSlime)
    statuses.push({ id: 'SLIME', label: 'Слизь', hint: 'Маркер Слизи на планшете (стр. 17)', tone: 'toxic' });
  if (player.hasLarva) {
    statuses.push({
      id: 'LARVA',
      label: 'Личинка',
      hint: 'Личинка на планшете: повторная Инфекция опасна',
      tone: 'danger',
    });
  }
  return statuses;
}

export function buildPlayerBoardSummary(
  view: SanitizedGameState,
  player: SanitizedPlayerState,
  inCombat: boolean,
): PlayerBoardSummary {
  const isActive = view.meta.activePlayerId === player.id;
  return {
    handCount: player.actionDeck.hand.length,
    handLimit: player.handLimit ?? getSanitizedPlayerHandLimit(view, player.id),
    drawPileCount: player.actionDeck.drawPileCount,
    discardCount: player.actionDeck.discardCount,
    canAct: isActive && !player.hasPassed && view.meta.phase === 'PLAYER_PHASE',
    actions: { used: player.actionsPerformedThisRound, limit: player.hasAdrenalineRush ? null : ACTIONS_PER_TURN },
    vitals: vitalsSummary(player),
    contamination: contaminationSummary(player),
    statuses: boardStatuses(view, player, inCombat),
    inventoryCount: player.inventory?.length ?? 0,
    occupiedHandSlots: player.handSlots.length,
  };
}
