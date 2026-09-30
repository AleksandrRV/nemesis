import type {
  CharacterClass,
  CrewAssignment,
  CrewSetupState,
  RoleSelectionMode,
  SanitizedCrewSetup,
  TableSeat,
  TableSeating,
} from '@nemesis/shared';
import {
  EngineError,
  crewAssignment,
  crewSetupPicker,
  filterCrewSetupForSeat,
  isCrewReady,
  pickRandomRole,
  pickRole,
  startCrewSetup,
} from '@nemesis/shared';

export interface CrewSetupOptions {
  seed: string;
  seats: readonly TableSeat[];
  roleSelection: RoleSelectionMode;
}

/** Предстартовая подготовка экипажа: полное состояние (все Цели) живёт здесь и наружу уходит только срезом места. */
export class CrewSetupSession {
  private state: CrewSetupState;
  private viewerId: string;

  constructor(options: CrewSetupOptions) {
    this.state = startCrewSetup(options.seed, options.seats, options.roleSelection);
    this.viewerId = this.defaultViewer();
  }

  get seed(): string {
    return this.state.seed;
  }

  view(): SanitizedCrewSetup {
    return filterCrewSetupForSeat(this.state, this.viewerId);
  }

  localHumanIds(): string[] {
    return [...this.state.seats]
      .sort((left, right) => left.orderNumber - right.orderNumber)
      .filter((seat) => seat.kind === 'LOCAL_HUMAN')
      .map((seat) => seat.playerId);
  }

  /** Смотреть подготовку можно только глазами человека за этим устройством. */
  viewAs(playerId: string): void {
    if (!this.localHumanIds().includes(playerId)) {
      throw new EngineError('UNKNOWN_PLAYER', 'Этим местом управляет не человек за этим устройством.');
    }
    this.viewerId = playerId;
  }

  pendingBotId(): string | null {
    const picker = crewSetupPicker(this.state);
    return picker !== null && this.kindOf(picker) === 'BOT' ? picker : null;
  }

  pickAsViewer(role: CharacterClass): void {
    this.state = pickRole(this.state, this.viewerId, role);
    this.followPicker();
  }

  /** Тайм-аут выбора: роль назначается случайно тому, кто сейчас выбирает. */
  pickRandomForCurrent(): void {
    const picker = crewSetupPicker(this.state);
    if (picker === null) throw new EngineError('NOT_YOUR_PICK', 'Все Персонажи уже выбраны.');
    this.state = pickRandomRole(this.state, picker);
    this.followPicker();
  }

  isReady(): boolean {
    return isCrewReady(this.state);
  }

  assignment(): CrewAssignment {
    return crewAssignment(this.state);
  }

  seating(): TableSeating[] {
    return [...this.state.seats]
      .sort((left, right) => left.orderNumber - right.orderNumber)
      .map((seat) => ({
        playerId: seat.playerId,
        kind: seat.kind,
        label: seat.label,
        ...(seat.kind === 'BOT' ? { difficulty: seat.difficulty ?? 'CREW' } : {}),
      }));
  }

  private kindOf(playerId: string): TableSeat['kind'] | undefined {
    return this.state.seats.find((seat) => seat.playerId === playerId)?.kind;
  }

  private defaultViewer(): string {
    return this.localHumanIds()[0] ?? this.state.seats[0]!.playerId;
  }

  private followPicker(): void {
    const picker = crewSetupPicker(this.state);
    if (picker !== null && this.kindOf(picker) === 'LOCAL_HUMAN') this.viewerId = picker;
  }
}
