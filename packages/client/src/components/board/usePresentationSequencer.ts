import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import {
  diffBoardSnapshots,
  type BoardAnimation,
  BOARD_ANIMATION_TTL_MS,
  EXPLORATION_ANIMATION_TTL_MS,
  NOISE_POP_TTL_MS,
  CONTACT_TEASE_TTL_MS,
} from './boardAnimationModel';
import { initialContactSequence, nextContactPresentation, type ContactPresentationEntry } from '../contact/contactPresentationModel';
import { usePresentationStore, type SequencedItem, type SequencedDieRoll } from '../../store/presentationStore';


function extractSequenceFromKey(key: string): number {
  const match = key.match(/-(\d+)$/);
  if (match) return Number(match[1]);
  const tMatch = key.match(/t(\d+)$/);
  if (tMatch) return Number(tMatch[1]);
  return 0;
}

function getPriority(kind: SequencedItem['kind']): number {
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

function buildSequencedItems(
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
          const dieRoll: SequencedDieRoll = {
            key: anim.key,
            sequence: seq,
            roomId: (anim as Extract<BoardAnimation, { kind: 'NOISE_ROLL' }>).roomId,
            result: (anim as Extract<BoardAnimation, { kind: 'NOISE_ROLL' }>).face,
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
        const otherAnim = anim as BoardAnimation;
        items.push({ kind: 'OTHER', key: otherAnim.key, sequence: seq, animation: otherAnim });
        break;
      }
    }
  }

  let seen = contactSeen;
  let next = nextContactPresentation(view.gameLog, seen);
  while (next) {
    items.push({ kind: 'CONTACT', key: `contact-${next.id}`, sequence: next.sequence, entry: next });
    seen = next.sequence;
    next = nextContactPresentation(view.gameLog, seen);
  }

  items.sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return getPriority(a.kind) - getPriority(b.kind);
  });

  return items;
}

function cloneView(view: SanitizedGameState): SanitizedGameState {
  return structuredClone(view) as SanitizedGameState;
}

export function usePresentationSequencer(view: SanitizedGameState | null): {
  activeBoardAnimations: BoardAnimation[];
  activeDieRoll: SequencedDieRoll | null;
  activeContact: ContactPresentationEntry | null;
  renderView: SanitizedGameState | null;
  inTransitPlayerIds: Set<string>;
  inTransitIntruderIds: Set<string>;
  hasContactTease: boolean;
  noisePopCorridorIds: Set<string>;
  noiseRollCorridorIds: Set<string>;
  hasTechnicalNoisePop: boolean;
  dismissDieRoll: () => void;
  dismissContact: (sequence: number) => void;
  isIdle: boolean;
} {
  const previousRef = React.useRef<SanitizedGameState | null>(null);
  const mountedRef = React.useRef(true);
  const timeoutRef = React.useRef<number | null>(null);

  const {
    queue,
    active,
    contactSeen,
    activeBoardAnimations,
    activeDieRoll,
    activeContact,
    isIdle,
    setQueue,
    setActive,
    setContactSeen,
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

  React.useEffect(() => {
    if (!view) return;
    const previous = previousRef.current;
    if (!previous) {
      previousRef.current = view;
      setContactSeen(initialContactSequence(view.gameLog));
      return;
    }
    previousRef.current = view;
    const freshAnimations = diffBoardSnapshots(previous, view);
    const newItems = buildSequencedItems(freshAnimations, view, contactSeen);

    if (newItems.length === 0) return;

    setQueue((prev: SequencedItem[]) => {
      const existingKeys = new Set(prev.map((i) => i.key));
      if (active) existingKeys.add(active.key);
      const filtered = newItems.filter((i) => !existingKeys.has(i.key));
      if (filtered.length === 0) return prev;
      const merged = [...prev, ...filtered].sort((a, b) => {
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return getPriority(a.kind) - getPriority(b.kind);
      });
      return merged;
    });
  }, [view, active, contactSeen, setQueue, setContactSeen]);

  React.useEffect(() => {
    if (active) return;
    if (queue.length === 0) return;

    const next = queue[0]!;
    setQueue((prev: SequencedItem[]) => prev.slice(1));
    setActive(next);

    let ttl: number | null = null;
    switch (next.kind) {
      case 'PLAYER_MOVE':
      case 'INTRUDER_MOVE':
      case 'INTRUDER_TO_TECH':
      case 'DOOR_BREACHED':
        ttl = 900;
        break;
      case 'ROOM_REVEAL':
        ttl = 2800;
        break;
      case 'EXPLORATION_REVEAL':
        ttl = EXPLORATION_ANIMATION_TTL_MS;
        break;
      case 'NOISE_POP':
        ttl = NOISE_POP_TTL_MS;
        break;
      case 'CONTACT_TEASE':
        ttl = CONTACT_TEASE_TTL_MS;
        break;
      case 'OTHER':
        ttl = BOARD_ANIMATION_TTL_MS;
        break;
      case 'NOISE_ROLL':
      case 'CONTACT':
        ttl = null;
        break;
    }

    if (ttl !== null) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setActive(null);
      }, ttl);
    }
  }, [queue, active, setQueue, setActive]);

  const renderView = React.useMemo(() => {
    if (!view) return null;
    if (!active && queue.length === 0) return view;

    const pendingReveal = new Set<number>();
    const activeRevealRoomId = active?.kind === 'ROOM_REVEAL' ? (active.animation as Extract<BoardAnimation, { kind: 'ROOM_REVEAL' }>).roomId : null;

    for (const item of queue) {
      if (item.kind === 'ROOM_REVEAL') pendingReveal.add((item.animation as Extract<BoardAnimation, { kind: 'ROOM_REVEAL' }>).roomId);
      if (item.kind === 'EXPLORATION_REVEAL') pendingReveal.add((item.animation as Extract<BoardAnimation, { kind: 'EXPLORATION_REVEAL' }>).roomId);
    }
    if (active) {
      if (active.kind === 'ROOM_REVEAL') pendingReveal.add((active.animation as Extract<BoardAnimation, { kind: 'ROOM_REVEAL' }>).roomId);
      if (active.kind === 'EXPLORATION_REVEAL') pendingReveal.add((active.animation as Extract<BoardAnimation, { kind: 'EXPLORATION_REVEAL' }>).roomId);
    }

    if (active && (active.kind === 'PLAYER_MOVE' || active.kind === 'INTRUDER_MOVE' || active.kind === 'INTRUDER_TO_TECH' || active.kind === 'DOOR_BREACHED')) {
      const cloned = cloneView(view);
      for (const roomId of pendingReveal) {
        const room = cloned.ship.rooms[roomId];
        if (room) room.isExplored = false;
      }
      return cloned;
    }

    if (active && active.kind === 'ROOM_REVEAL') {
      const cloned = cloneView(view);
      for (const roomId of pendingReveal) {
        if (roomId !== activeRevealRoomId) {
          const room = cloned.ship.rooms[roomId];
          if (room) room.isExplored = false;
        }
      }
      return cloned;
    }

    return view;
  }, [view, active, queue]);

  const inTransitPlayerIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const anim of activeBoardAnimations) {
      if (anim.kind === 'PLAYER_MOVE') set.add(anim.playerId);
    }
    return set;
  }, [activeBoardAnimations]);

  const inTransitIntruderIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const anim of activeBoardAnimations) {
      if (anim.kind === 'INTRUDER_MOVE') set.add(anim.intruderId);
    }
    return set;
  }, [activeBoardAnimations]);

  const hasContactTease = React.useMemo(() => activeBoardAnimations.some((a) => a.kind === 'CONTACT_TEASE'), [activeBoardAnimations]);

  const noisePopCorridorIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const anim of activeBoardAnimations) {
      if (anim.kind === 'NOISE_POP' && anim.corridorId) set.add(anim.corridorId);
    }
    return set;
  }, [activeBoardAnimations]);

  const noiseRollCorridorIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const anim of activeBoardAnimations) {
      if (anim.kind === 'NOISE_ROLL' && anim.corridorId) set.add(anim.corridorId);
      if (anim.kind === 'NOISE_POP' && anim.corridorId) set.add(anim.corridorId);
    }
    return set;
  }, [activeBoardAnimations]);

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
    hasContactTease,
    noisePopCorridorIds,
    noiseRollCorridorIds,
    hasTechnicalNoisePop,
    dismissDieRoll,
    dismissContact,
    isIdle,
  };
}
