import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import {
  diffBoardSnapshots,
  snapshotBatchBaseline,
  type BoardAnimation,
  BOARD_ANIMATION_TTL_MS,
  EXPLORATION_ANIMATION_TTL_MS,
  NOISE_POP_TTL_MS,
  CONTACT_TEASE_TTL_MS,
  ROOM_REVEAL_TTL_MS,
  ROOM_SETTLE_TTL_MS,
} from './boardAnimationModel';
import { DOOR_TRANSITION_DURATION_MS, heldDoorStates } from './doorTransitionModel';
import {
  initialContactSequence,
  nextContactPresentation,
  type ContactPresentationEntry,
} from '../contact/contactPresentationModel';
import { usePresentationStore, type SequencedDieRoll, type SequencedItem } from '../../store/presentationStore';

function extractSequenceFromKey(key: string): number {
  const match = key.match(/-(\d+)$/);
  if (match) return Number(match[1]);
  const tMatch = key.match(/t(\d+)$/);
  if (tMatch) return Number(tMatch[1]);
  return 0;
}

/**
 * Приоритет внутри одного секвенса журнала. Причинно-следственная связь
 * цепочки «переход → вскрытие → шум → контакт»: движение всегда первое,
 * удержка переворота комнаты — перед броском Шума, Контакт — последним.
 */
export function getPresentationPriority(kind: SequencedItem['kind']): number {
  switch (kind) {
    case 'PLAYER_MOVE':
      return 10;
    case 'INTRUDER_MOVE':
    case 'INTRUDER_TO_TECH':
    case 'DOOR_BREACHED':
      return 15;
    case 'ROOM_REVEAL':
      return 20;
    case 'EXPLORATION_REVEAL':
      return 25;
    case 'REVEAL_SETTLE':
      return 27;
    case 'NOISE_ROLL':
      return 30;
    case 'NOISE_POP':
      return 40;
    case 'CONTACT_TEASE':
      return 45;
    case 'CONTACT':
      return 50;
    default:
      return 100;
  }
}

function sortItems(items: SequencedItem[]): SequencedItem[] {
  return [...items].sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return getPresentationPriority(a.kind) - getPresentationPriority(b.kind);
  });
}

/**
 * Собирает элементы очереди из свежих анимаций и непросмотренных Контактов.
 * Экспортирована для регрессионных тестов порядка.
 */
export function buildSequencedItems(
  freshAnimations: BoardAnimation[],
  view: SanitizedGameState,
  contactSeen: number,
): SequencedItem[] {
  const items: SequencedItem[] = [];

  for (const anim of freshAnimations) {
    const seq = extractSequenceFromKey(anim.key);
    switch (anim.kind) {
      case 'PLAYER_MOVE':
        items.push({ kind: 'PLAYER_MOVE', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'INTRUDER_MOVE':
        items.push({ kind: 'INTRUDER_MOVE', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'INTRUDER_TO_TECH':
        items.push({ kind: 'INTRUDER_TO_TECH', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'DOOR_BREACHED':
        items.push({ kind: 'DOOR_BREACHED', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'ROOM_REVEAL':
        items.push({ kind: 'ROOM_REVEAL', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'EXPLORATION_REVEAL':
        items.push({ kind: 'EXPLORATION_REVEAL', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'NOISE_ROLL': {
        const logEntry = view.gameLog.find((e) => e.sequence === seq && e.event.type === 'NOISE_ROLLED');
        if (logEntry && logEntry.event.type === 'NOISE_ROLLED') {
          const playerName = view.players[logEntry.event.playerId]?.name ?? logEntry.event.playerId;
          const dieRoll: SequencedDieRoll = {
            key: anim.key,
            sequence: seq,
            roomId: logEntry.event.roomId,
            result: logEntry.event.result,
            playerName,
          };
          items.push({ kind: 'NOISE_ROLL', key: anim.key, sequence: seq, dieRoll, animation: anim });
        } else {
          const rollAnim = anim as Extract<BoardAnimation, { kind: 'NOISE_ROLL' }>;
          const dieRoll: SequencedDieRoll = {
            key: anim.key,
            sequence: seq,
            roomId: rollAnim.roomId,
            result: rollAnim.face,
            playerName: 'Экипаж',
          };
          items.push({ kind: 'NOISE_ROLL', key: anim.key, sequence: seq, dieRoll, animation: anim });
        }
        break;
      }
      case 'NOISE_POP':
        items.push({ kind: 'NOISE_POP', key: anim.key, sequence: seq, animation: anim });
        break;
      case 'CONTACT_TEASE':
        items.push({ kind: 'CONTACT_TEASE', key: anim.key, sequence: seq, animation: anim });
        break;
      default: {
        // Свитч покрыл все виды анимаций — здесь anim сужен до never,
        // поэтому поднимаем его обратно до полного объединения.
        const otherAnim = anim as BoardAnimation;
        items.push({ kind: 'OTHER', key: otherAnim.key, sequence: seq, animation: otherAnim });
        break;
      }
    }
  }

  // Контакты: каждое непросмотренное окно — отдельный элемент очереди
  // (жетон Чужого показывается только после всех предыдущих анимаций).
  let seen = contactSeen;
  let next = nextContactPresentation(view.gameLog, seen);
  while (next) {
    items.push({
      kind: 'CONTACT',
      key: `contact-${next.id}`,
      sequence: next.sequence,
      entry: next,
      intruderId: next.event.type === 'CONTACT_OCCURRED' ? next.event.intruderId : null,
    });
    seen = next.sequence;
    next = nextContactPresentation(view.gameLog, seen);
  }

  // Удержка переворота комнаты: после скана и карточки очередь ждёт, пока
  // RoomHex покажет туман→скан→имя→иконки, и только потом открывает Шум.
  const roomReveals = new Map<number, { key: string; sequence: number }>();
  const explorations = new Map<number, { key: string; sequence: number }>();
  for (const item of items) {
    if (item.kind === 'ROOM_REVEAL') {
      roomReveals.set(item.animation.roomId, { key: item.key, sequence: item.sequence });
    }
    if (item.kind === 'EXPLORATION_REVEAL') {
      explorations.set(item.animation.roomId, { key: item.key, sequence: item.sequence });
    }
  }
  for (const [roomId, reveal] of roomReveals) {
    const exploration = explorations.get(roomId);
    const settle = exploration ?? reveal;
    items.push({ kind: 'REVEAL_SETTLE', key: `rs-${roomId}-${settle.sequence}`, sequence: settle.sequence, roomId });
  }

  return sortItems(items);
}

function cloneView(view: SanitizedGameState): SanitizedGameState {
  return structuredClone(view) as SanitizedGameState;
}

/** Сколько миллисекунд элемент держит очередь. null — ждёт закрытия игроком. */
function ttlForItem(item: SequencedItem, reducedMotion: boolean): number | null {
  switch (item.kind) {
    case 'PLAYER_MOVE':
    case 'INTRUDER_MOVE':
    case 'INTRUDER_TO_TECH':
      return 900;
    case 'DOOR_BREACHED':
      return DOOR_TRANSITION_DURATION_MS.BREACH;
    case 'ROOM_REVEAL':
      return ROOM_REVEAL_TTL_MS;
    case 'REVEAL_SETTLE':
      return reducedMotion ? 350 : ROOM_SETTLE_TTL_MS;
    case 'EXPLORATION_REVEAL':
      return EXPLORATION_ANIMATION_TTL_MS;
    case 'NOISE_POP':
      return NOISE_POP_TTL_MS;
    case 'CONTACT_TEASE':
      return CONTACT_TEASE_TTL_MS;
    case 'OTHER':
      return BOARD_ANIMATION_TTL_MS;
    case 'NOISE_ROLL':
    case 'CONTACT':
      return null;
  }
}

export function usePresentationSequencer(
  view: SanitizedGameState | null,
  options: { reducedMotion?: boolean } = {},
): {
  activeBoardAnimations: BoardAnimation[];
  activeDieRoll: SequencedDieRoll | null;
  activeContact: ContactPresentationEntry | null;
  renderView: SanitizedGameState | null;
  inTransitPlayerIds: Set<string>;
  inTransitIntruderIds: Set<string>;
  hiddenNewIntruderIds: Set<string>;
  hasContactTease: boolean;
  noisePopCorridorIds: Set<string>;
  noiseRollCorridorIds: Set<string>;
  hasTechnicalNoisePop: boolean;
  dismissDieRoll: () => void;
  dismissContact: (sequence: number) => void;
  isIdle: boolean;
} {
  const reducedMotion = options.reducedMotion ?? false;
  const previousRef = React.useRef<SanitizedGameState | null>(null);
  const mountedRef = React.useRef(true);
  const timeoutRef = React.useRef<number | null>(null);

  const {
    queue,
    active,
    contactSeen,
    batchBaseline,
    activeBoardAnimations,
    activeDieRoll,
    activeContact,
    isIdle,
    setQueue,
    setActive,
    setContactSeen,
    mergeBatchBaseline,
    dismissDieRoll,
    dismissContact,
  } = usePresentationStore();

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // useLayoutEffect: пачка ставится в очередь ДО отрисовки кадра — иначе
  // персонаж на один кадр «телепортируется» в новый отсек до анимации.
  React.useLayoutEffect(() => {
    if (!view) return;
    const previous = previousRef.current;
    if (!previous) {
      // Первый срез (загрузка страницы): история не проигрывается.
      previousRef.current = view;
      setContactSeen(initialContactSequence(view.gameLog));
      return;
    }
    if (previous === view) return; // перезапуск из-за active/contactSeen — нового среза нет
    previousRef.current = view;

    const freshAnimations = diffBoardSnapshots(previous, view);
    const newItems = buildSequencedItems(freshAnimations, view, contactSeen);
    if (newItems.length === 0) return;

    mergeBatchBaseline(snapshotBatchBaseline(previous, view));

    setQueue((prev: SequencedItem[]) => {
      const existingKeys = new Set(prev.map((item) => item.key));
      const currentActive = usePresentationStore.getState().active;
      if (currentActive) existingKeys.add(currentActive.key);
      const filtered = newItems.filter((item) => !existingKeys.has(item.key));
      if (filtered.length === 0) return prev;
      return sortItems([...prev, ...filtered]);
    });
  }, [view, contactSeen, setQueue, setContactSeen, mergeBatchBaseline]);

  // useLayoutEffect: следующий элемент активируется до отрисовки кадра.
  React.useLayoutEffect(() => {
    if (active) return;
    if (queue.length === 0) return;

    const next = queue[0]!;
    setQueue((prev: SequencedItem[]) => prev.slice(1));
    setActive(next);

    // Таймер предыдущего элемента сбрасывается ВСЕГДА: «висящий» таймер
    // короткого анимационного шага закрывал только что открытое окно кубика.
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    const ttl = ttlForItem(next, reducedMotion);
    if (ttl !== null) {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        if (!mountedRef.current) return;
        setActive(null);
      }, ttl);
    }
  }, [queue, active, reducedMotion, setQueue, setActive]);

  const pendingItems = React.useMemo(() => (active ? [...queue, active] : queue), [queue, active]);

  /**
   * Откат презентации: пока шаги пачки не доиграны, на поле видно только
   * «прошлое» — тайл ещё под туманом, маркера Шума нет. Каждый визуальный
   * шаг снимает свой откат в свой момент: туман держится до REVEAL_SETTLE
   * (скан и карточка играют по туману), маркер Шума появляется ровно в момент
   * активации своего NOISE_POP — анимация всплеска играет уже на настоящем
   * маркере, поэтому откат шума берётся только из ещё ждущих шагов очереди.
   */
  const renderView = React.useMemo(() => {
    if (!view) return null;
    if (pendingItems.length === 0) return view;

    const pendingReveal = new Set<number>();
    for (const item of pendingItems) {
      if (item.kind === 'ROOM_REVEAL' || item.kind === 'EXPLORATION_REVEAL') {
        // Активное вскрытие тоже держит туман: имя и иконки появляются
        // только на шаге REVEAL_SETTLE, после скана и карточки.
        pendingReveal.add(item.animation.roomId);
      }
    }

    const queuedNoise = new Set<string>();
    let queuedTechNoise = false;
    for (const item of queue) {
      if (item.kind === 'NOISE_ROLL' || item.kind === 'NOISE_POP') {
        if (item.animation.isTechnical) queuedTechNoise = true;
        else if (item.animation.corridorId) queuedNoise.add(item.animation.corridorId);
      }
    }

    const heldDoors = heldDoorStates(queue, batchBaseline, view.ship.corridors);

    if (pendingReveal.size === 0 && queuedNoise.size === 0 && !queuedTechNoise && heldDoors.size === 0) return view;

    const cloned = cloneView(view);
    for (const [corridorId, doorState] of heldDoors) {
      const corridor = cloned.ship.corridors[corridorId];
      if (corridor) corridor.doorState = doorState;
    }
    for (const roomId of pendingReveal) {
      const room = cloned.ship.rooms[roomId];
      if (room) room.isExplored = false;
    }
    if (batchBaseline && (queuedNoise.size > 0 || queuedTechNoise)) {
      // Прячем только шум, поставленный этой пачкой: маркеры прежних ходов
      // и так были на поле и откатывать их нельзя.
      if (queuedNoise.size > 0) {
        for (const corridorId of queuedNoise) {
          if (!batchBaseline.noiseCorridorIds.has(corridorId)) continue;
          const corridor = cloned.ship.corridors[corridorId];
          if (corridor) corridor.hasNoise = false;
        }
      }
      if (queuedTechNoise && batchBaseline.techNoise) cloned.ship.technicalCorridorNoise = false;
    }
    return cloned;
  }, [view, pendingItems, queue, batchBaseline]);

  /** Миниатюры Чужих, поставленные недоигранным Контактом: на поле их ещё нет. */
  const hiddenNewIntruderIds = React.useMemo(() => {
    const contactIntruders = new Set<string>();
    for (const item of pendingItems) {
      if (item.kind === 'CONTACT' && item.intruderId) contactIntruders.add(item.intruderId);
    }
    if (contactIntruders.size === 0 || !batchBaseline) return new Set<string>();
    const hidden = new Set<string>();
    for (const id of contactIntruders) {
      if (batchBaseline.newIntruderIds.has(id)) hidden.add(id);
    }
    return hidden;
  }, [pendingItems, batchBaseline]);

  /** Персонажи в пути: скрыты со статического поля от постановки в очередь до конца скольжения. */
  const inTransitPlayerIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of pendingItems) {
      if (item.kind === 'PLAYER_MOVE') set.add(item.animation.playerId);
    }
    return set;
  }, [pendingItems]);

  const inTransitIntruderIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of pendingItems) {
      if (item.kind === 'INTRUDER_MOVE') set.add(item.animation.intruderId);
    }
    return set;
  }, [pendingItems]);

  const hasContactTease = React.useMemo(
    () => activeBoardAnimations.some((a) => a.kind === 'CONTACT_TEASE'),
    [activeBoardAnimations],
  );

  const noisePopCorridorIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const anim of activeBoardAnimations) {
      if (anim.kind === 'NOISE_POP' && anim.corridorId) set.add(anim.corridorId);
    }
    return set;
  }, [activeBoardAnimations]);

  // Подсветка затронутых коридоров живёт только на шаге NOISE_POP (после
  // закрытия окна кубика): у активного NOISE_ROLL визуального слоя нет.
  const noiseRollCorridorIds = noisePopCorridorIds;

  const hasTechnicalNoisePop = React.useMemo(
    () => activeBoardAnimations.some((a) => a.kind === 'NOISE_POP' && a.isTechnical),
    [activeBoardAnimations],
  );

  return {
    activeBoardAnimations,
    activeDieRoll,
    activeContact,
    renderView,
    inTransitPlayerIds,
    inTransitIntruderIds,
    hiddenNewIntruderIds,
    hasContactTease,
    noisePopCorridorIds,
    noiseRollCorridorIds,
    hasTechnicalNoisePop,
    dismissDieRoll,
    dismissContact,
    isIdle,
  };
}
