import type { EngineAction, GameState, SanitizedGameState } from '@nemesis/shared';
import { GameEngine, createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import type { SessionStorage } from '../session/sessionStorage';
import { createLocalSessionStorage } from '../session/sessionStorage';
import { createSeed } from '../session/seed';
import type { GameEvent, IGameTransport } from './ITransport';

export interface LocalTransportOptions {
  /** Сохранение партии: полное состояние принадлежит движку, а не стору. */
  session: SessionStorage;
  /** Наблюдатель: в офлайн-партии это единственный персонаж. */
  playerId: string;
  /** Сид новой партии, если совместимого сохранения нет. */
  seed?: string;
  /** Отладочные действия: разрешены только в dev-сборке. */
  allowDevActions?: boolean;
  /** Движок можно подменить в тестах. */
  engine?: GameEngine;
}

/**
 * Причина отказа для интерфейса. Движок бросает `EngineError` с текстом на
 * русском, но упасть на чужом значении (например, из будущего сетевого слоя)
 * транспорт не имеет права: игрок должен увидеть причину, а не пустой экран.
 */
export function rejectionReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Локальный транспорт: движок правил работает в той же вкладке, что и интерфейс
 * (tech_stack §5.2, офлайн-режим телефона без сети).
 *
 * Полное состояние никогда не покидает транспорт: наружу уходит только
 * `filterStateForPlayer`, а сохранение пишется в `SessionStorage`.
 */
export class LocalInMemoryTransport implements IGameTransport {
  private readonly engine: GameEngine;
  private readonly session: SessionStorage;
  private readonly playerId: string;
  private readonly allowDevActions: boolean;
  private readonly stateSubscribers = new Set<(state: SanitizedGameState) => void>();
  private readonly eventSubscribers = new Set<(event: GameEvent) => void>();
  private localState: GameState;

  constructor(options: LocalTransportOptions) {
    this.engine = options.engine ?? new GameEngine();
    this.session = options.session;
    this.playerId = options.playerId;
    this.allowDevActions = options.allowDevActions ?? false;
    this.localState = this.session.load() ?? createInitialGameState(options.seed ?? createSeed());
  }

  async init(): Promise<void> {
    // Первое сохранение фиксирует только что начатую партию: если сохранения
    // не было, стол уже брошен, и его нужно записать.
    this.session.save(this.localState);
    this.broadcastState();
  }

  sendAction(action: EngineAction): void {
    try {
      this.localState = this.engine.processAction(this.localState, action, {
        actorId: this.playerId,
        allowDevActions: this.allowDevActions,
      });
    } catch (error) {
      this.emitEvent({
        type: 'ACTION_REJECTED',
        action,
        reason: rejectionReason(error),
      });
      return;
    }

    this.session.save(this.localState);
    this.broadcastState();
    this.emitEvent({ type: 'ACTION_APPLIED', action });
  }

  /** Новая партия: старое сохранение стирается, стол бросается заново. */
  startNewGame(seed?: string): void {
    this.session.clear();
    this.localState = createInitialGameState(seed ?? createSeed());
    this.session.save(this.localState);
    this.broadcastState();
  }

  /** Полное состояние — только для тестов и будущего сервера; в UI не попадает. */
  getLocalState(): GameState {
    return this.localState;
  }

  subscribeToState(callback: (state: SanitizedGameState) => void): () => void {
    this.stateSubscribers.add(callback);

    return () => void this.stateSubscribers.delete(callback);
  }

  subscribeToEvents(callback: (event: GameEvent) => void): () => void {
    this.eventSubscribers.add(callback);

    return () => void this.eventSubscribers.delete(callback);
  }

  /** Отключает подписчиков: вызывается при старте новой партии вместо старого транспорта. */
  dispose(): void {
    this.stateSubscribers.clear();
    this.eventSubscribers.clear();
  }

  private broadcastState(): void {
    const view = filterStateForPlayer(this.localState, this.playerId);

    for (const callback of this.stateSubscribers) {
      callback(view);
    }
  }

  private emitEvent(event: GameEvent): void {
    for (const callback of this.eventSubscribers) {
      callback(event);
    }
  }
}

export interface LocalTransportFactoryOptions {
  playerId?: string;
  seed?: string;
  allowDevActions?: boolean;
}

/**
 * Транспорт офлайн-партии: сохранение берётся из localStorage (или из памяти,
 * если браузер его не даёт), сид новой партии — случайный UUID.
 */
export function createLocalTransport(options: LocalTransportFactoryOptions = {}): LocalInMemoryTransport {
  return new LocalInMemoryTransport({
    session: createLocalSessionStorage(),
    playerId: options.playerId ?? 'player-1',
    seed: options.seed,
    allowDevActions: options.allowDevActions,
  });
}
