import type {
  CharacterClass,
  CommsDraft,
  CrewAssignment,
  EngineAction,
  GameState,
  SanitizedCrewSetup,
  SanitizedGameState,
  TableSeating,
} from '@nemesis/shared';
import { GameEngine, createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import type { SessionDiscardReason, SessionStorage } from '../session/sessionStorage';
import { createLocalSessionStorage, everyoneAtThisDevice } from '../session/sessionStorage';
import { createSeed } from '../session/seed';
import { BotController } from './BotController';
import { CrewSetupSession, type CrewSetupOptions } from './CrewSetupSession';
import type { GameEvent, IGameTransport } from './ITransport';
import { SeatController } from './SeatController';

export interface LocalTransportOptions {
  /** Сохранение партии: полное состояние принадлежит движку, а не стору. */
  session: SessionStorage;
  /** Первый зритель, если сохранение не указывает людей за устройством. */
  playerId: string;
  /** Сид новой партии, если совместимого сохранения нет. */
  seed?: string;
  /** Отладочные действия: разрешены только в dev-сборке. */
  allowDevActions?: boolean;
  /** Движок можно подменить в тестах. */
  engine?: GameEngine;
}

export interface NewGameOptions {
  chosenCharacterClass?: CharacterClass;
  crew?: CrewAssignment;
  seating?: readonly TableSeating[];
}

/** Возможности локального стола сверх транспорта: подготовка экипажа, места и ход ботов. */
export interface LocalTableControls {
  startNewGame(seed?: string, options?: NewGameOptions): void;
  beginCrewSetup(options: Omit<CrewSetupOptions, 'seed'> & { seed?: string }): void;
  viewCrewSetupAs(playerId: string): void;
  pickRole(role: CharacterClass): void;
  pickRandomRole(): void;
  launchCrew(): void;
  cancelCrewSetup(): void;
  pendingBotId(): string | null;
  stepBot(): boolean;
  getSeating(): TableSeating[];
  subscribeToCrewSetup(callback: (setup: SanitizedCrewSetup | null) => void): () => void;
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
 * (tech_stack §5.2). Полное состояние не покидает транспорт: наружу уходит только
 * срез текущего зрителя — человека за этим устройством, чьего ответа ждут.
 */
export class LocalInMemoryTransport implements IGameTransport, LocalTableControls {
  private readonly engine: GameEngine;
  private readonly session: SessionStorage;
  private readonly allowDevActions: boolean;
  private readonly stateSubscribers = new Set<(state: SanitizedGameState) => void>();
  private readonly eventSubscribers = new Set<(event: GameEvent) => void>();
  private readonly setupSubscribers = new Set<(setup: SanitizedCrewSetup | null) => void>();
  private localState: GameState;
  private seats: SeatController;
  private bots: BotController;
  private viewerId: string;
  private crewSetup: CrewSetupSession | null = null;
  private discardedSession: SessionDiscardReason | null;

  constructor(options: LocalTransportOptions) {
    this.engine = options.engine ?? new GameEngine();
    this.session = options.session;
    this.allowDevActions = options.allowDevActions ?? false;
    const restored = this.session.restore();
    this.discardedSession = restored.discarded;
    this.localState = restored.state ?? createInitialGameState(options.seed ?? createSeed());
    this.seats = new SeatController(restored.state ? restored.seating : everyoneAtThisDevice(this.localState));
    this.bots = BotController.forTable(this.localState, this.seats.getSeating(), restored.bots);
    this.viewerId = this.seats.nextViewer(this.localState, this.seats.localHumanIds()[0] ?? options.playerId);
  }

  async init(): Promise<void> {
    this.saveSession();
    this.broadcastState();
    if (this.discardedSession) {
      this.emitEvent({ type: 'SESSION_DISCARDED', reason: this.discardedSession });
      this.discardedSession = null;
    }
  }

  sendAction(action: EngineAction): void {
    try {
      this.applyAction(action, this.viewerId);
    } catch (error) {
      this.emitEvent({ type: 'ACTION_REJECTED', action, reason: rejectionReason(error) });
      return;
    }
    this.seats.humanActed();
    this.afterStateChange();
    this.emitEvent({ type: 'ACTION_APPLIED', action });
  }

  /** Новая партия: старое сохранение стирается, стол бросается заново. */
  startNewGame(seed?: string, options: NewGameOptions = {}): void {
    this.session.clear();
    this.crewSetup = null;
    this.localState = createInitialGameState(seed ?? createSeed(), {
      chosenCharacterClass: options.chosenCharacterClass,
      crew: options.crew,
    });
    this.seats = new SeatController(options.seating ?? everyoneAtThisDevice(this.localState));
    this.bots = BotController.forTable(this.localState, this.seats.getSeating());
    this.viewerId = this.seats.nextViewer(this.localState, this.seats.localHumanIds()[0] ?? this.viewerId);
    this.saveSession();
    this.broadcastState();
    this.broadcastCrewSetup();
  }

  beginCrewSetup(options: Omit<CrewSetupOptions, 'seed'> & { seed?: string }): void {
    this.runSetupStep(() => {
      this.crewSetup = new CrewSetupSession({ ...options, seed: options.seed ?? createSeed() });
    });
  }

  viewCrewSetupAs(playerId: string): void {
    this.runSetupStep(() => this.requireCrewSetup().viewAs(playerId));
  }

  pickRole(role: CharacterClass): void {
    this.runSetupStep(() => this.requireCrewSetup().pickAsViewer(role));
  }

  pickRandomRole(): void {
    this.runSetupStep(() => this.requireCrewSetup().pickRandomForCurrent());
  }

  /** Экипаж собран: `createInitialGameState` получает готовых Персонажей, Цели и места. */
  launchCrew(): void {
    const setup = this.crewSetup;
    if (!setup?.isReady()) {
      this.emitEvent({ type: 'SETUP_REJECTED', reason: 'Не все места выбрали Персонажа.' });
      return;
    }
    this.startNewGame(setup.seed, { crew: setup.assignment(), seating: setup.seating() });
  }

  cancelCrewSetup(): void {
    this.crewSetup = null;
    this.broadcastCrewSetup();
  }

  pendingBotId(): string | null {
    if (this.crewSetup) return this.crewSetup.pendingBotId();
    return this.seats.pendingBotId(this.localState);
  }

  /** Один шаг бота (В8-2-4, В8-5-2): бот думает над своим срезом, движок принимает первый допустимый ход. */
  stepBot(): boolean {
    if (this.crewSetup) return this.stepSetupBot();
    let speech: CommsDraft[] = [];
    const move = this.seats.nextBotMove(this.localState, (state, botId) => {
      const thought = this.bots.think(state, botId);
      speech = thought.speech;
      return thought.candidates;
    });
    if (!move) return false;
    if (move.kind === 'STALLED') {
      this.emitEvent({ type: 'BOT_STALLED', botId: move.botId, reason: move.reason });
      return false;
    }
    this.sayForBot(move.botId, speech);
    const action = this.firstAcceptedAction(move.botId, move.candidates);
    if (!action) {
      this.seats.botRefused();
      this.saveSession();
      return true;
    }
    this.seats.botActed();
    this.afterStateChange();
    this.emitEvent({ type: 'BOT_ACTED', botId: move.botId, action });
    return true;
  }

  getSeating(): TableSeating[] {
    return this.seats.getSeating();
  }

  getViewerId(): string {
    return this.viewerId;
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

  subscribeToCrewSetup(callback: (setup: SanitizedCrewSetup | null) => void): () => void {
    this.setupSubscribers.add(callback);
    return () => void this.setupSubscribers.delete(callback);
  }

  /** Отключает подписчиков: вызывается при старте новой партии вместо старого транспорта. */
  dispose(): void {
    this.stateSubscribers.clear();
    this.eventSubscribers.clear();
    this.setupSubscribers.clear();
  }

  private applyAction(action: EngineAction, actorId: string): void {
    this.localState = this.engine.processAction(this.localState, action, {
      actorId,
      allowDevActions: this.allowDevActions,
    });
  }

  private firstAcceptedAction(botId: string, candidates: readonly EngineAction[]): EngineAction | null {
    for (const action of candidates) {
      try {
        this.applyAction(action, botId);
        return action;
      } catch {
        continue;
      }
    }
    return null;
  }

  /** Реплики бота — обычные сообщения Рации: лимиты и адресаты проверяет движок, отказ не срывает ход. */
  private sayForBot(botId: string, speech: readonly CommsDraft[]): void {
    for (const draft of speech) {
      try {
        this.applyAction({ type: 'ACTION_COMMS', payload: draft }, botId);
      } catch {
        continue;
      }
    }
  }

  private afterStateChange(): void {
    this.saveSession();
    const previousViewer = this.viewerId;
    this.viewerId = this.seats.nextViewer(this.localState, previousViewer);
    this.broadcastState();
    if (this.viewerId !== previousViewer) {
      this.emitEvent({
        type: 'VIEWER_CHANGED',
        viewerId: this.viewerId,
        handoff: this.seats.needsHandoff(previousViewer, this.viewerId),
      });
    }
  }

  private stepSetupBot(): boolean {
    if (this.crewSetup?.pendingBotId() === null) return false;
    this.runSetupStep(() => this.requireCrewSetup().pickRandomForCurrent());
    return true;
  }

  private requireCrewSetup(): CrewSetupSession {
    if (!this.crewSetup) throw new Error('Подготовка экипажа не начата.');
    return this.crewSetup;
  }

  private runSetupStep(step: () => void): void {
    try {
      step();
    } catch (error) {
      this.emitEvent({ type: 'SETUP_REJECTED', reason: rejectionReason(error) });
      return;
    }
    this.broadcastCrewSetup();
  }

  private saveSession(): void {
    this.session.save(this.localState, this.seats.getSeating(), this.bots.snapshot());
  }

  private broadcastState(): void {
    const view = filterStateForPlayer(this.localState, this.viewerId);
    for (const callback of this.stateSubscribers) callback(view);
  }

  private broadcastCrewSetup(): void {
    const view = this.crewSetup?.view() ?? null;
    for (const callback of this.setupSubscribers) callback(view);
  }

  private emitEvent(event: GameEvent): void {
    for (const callback of this.eventSubscribers) callback(event);
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
