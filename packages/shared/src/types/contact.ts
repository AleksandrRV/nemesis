import type { EventCorridorNumber, IntruderAttackCard } from './cards.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { IntruderToken, IntruderType } from './entities.js';
import type { RoomId } from './rooms.js';

/** Исход Отступления в бою: куда привёл номер Коридора с карты События (стр. 20). */
export type IntruderRetreatOutcome = 'MOVED' | 'DOOR_DESTROYED' | 'TECHNICAL_CORRIDORS' | 'STAYED';

/**
 * Розыгрыш Отступления Чужого по колоде Событий (стр. 20): вытянутая карта
 * сбрасывается без розыгрыша эффекта; Закрытая Дверь разрушается, а Чужой
 * остаётся (FAQ Rules 8); номер входа в вентиляцию снимает миниатюру с поля
 * и сбрасывает Раны (стр. 16).
 */
export interface IntruderRetreatRecord {
  eventCardId: string;
  eventCardName: string;
  corridorNumber: EventCorridorNumber;
  outcome: IntruderRetreatOutcome;
  /** Отсек, куда ушла миниатюра (заполнен только при исходе MOVED). */
  toRoomId: RoomId | null;
  /** Коридор направления: переход или разрушенная Дверь (не заполнен для вентиляции). */
  corridorId: string | null;
}

export interface AttackVictimStatus {
  playerId: string;
  isDead: boolean;
  lightWounds: number;
  seriousWounds: number;
  hasLarva: boolean;
  hasSlime: boolean;
}

export type IntruderLogEvent =
  | {
      type: 'CONTACT_OCCURRED';
      playerId: string;
      roomId: RoomId;
      tokenType: IntruderToken['type'];
      escapeNumber: number;
      handCount: number;
      intruderId: string | null;
      firstEncounter: boolean;
      surpriseAttack: boolean;
      source: 'NOISE' | 'CALL';
      /**
       * Заполняется только для жетона Личинки (стр. 18; INTRUDERS §2 —
       * «атакует автоматически»): миниатюра не ставится, персонаж немедленно
       * заражён. Повторная Личинка исчезает без гибели (FAQ Rules 12).
       */
      infestation?: { alreadyInfested: boolean };
    }
  | { type: 'FIRST_CONTACT'; playerId: string; roomId: RoomId }
  | { type: 'OBJECTIVE_CHOSEN'; playerId: string }
  | {
      type: 'SURPRISE_ATTACK_RESOLVED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      card: IntruderAttackCard | null;
      outcome: 'HIT' | 'MISS' | 'INFESTATION' | 'SUPPRESSED';
      victims: AttackVictimStatus[];
    }
  | {
      /** Побег (стр. 19): атака Чужого по убегающему до выхода из отсека. */
      type: 'ESCAPE_ATTACK_RESOLVED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      card: IntruderAttackCard | null;
      outcome: 'HIT' | 'MISS' | 'INFESTATION' | 'SUPPRESSED';
      victims: AttackVictimStatus[];
    }
  | { type: 'CONTAMINATION_RECEIVED'; playerId: string }
  | {
      type: 'SHOOT_RESOLVED';
      playerId: string;
      roomId: RoomId;
      /** Название Оружия из слота Руки (стр. 19) — публичный факт выстрела. */
      weaponName: string;
      /** Остаток Боезапаса после выстрела. */
      ammoLeft: number;
      targetIntruderId: string;
      targetType: IntruderType;
      dieFace: CombatDieFace;
      woundsBefore: number;
      injuries: number;
      woundsTotal: number;
      /** Карты проверки Стойкости: выкладываются лицом вверх (стр. 20). */
      toughnessCards: IntruderAttackCard[];
      toughnessTotal: number;
      killed: boolean;
      /** «Прицельный огонь»: показанная грань — результат переброса. */
      rerolled?: boolean;
      /** «Стрельба очередью»: сколько ед. Боезапаса сброшено с винтовки. */
      burstAmmoSpent?: number;
      /** Бонус Боевой винтовки: ≥1 Раны от выстрела — ещё 1 Рана. */
      rifleBonusApplied?: boolean;
      /** Стрелка Отступления у выжившего: розыгрыш направления по колоде Событий (стр. 20). */
      retreat?: IntruderRetreatRecord;
    }
  | {
      /** Базовое действие «Рукопашная атака» (стр. 19): публичный исход драки. */
      type: 'MELEE_RESOLVED';
      playerId: string;
      roomId: RoomId;
      targetIntruderId: string;
      targetType: IntruderType;
      dieFace: CombatDieFace;
      woundsBefore: number;
      /** В рукопашной грань наносит не больше 1 Раны (стр. 19: «2 Раны» = 1). */
      injuries: number;
      woundsTotal: number;
      /** Карты проверки Стойкости: выкладываются лицом вверх (стр. 20). */
      toughnessCards: IntruderAttackCard[];
      toughnessTotal: number;
      killed: boolean;
      /** Карта Заражения вытянута в сброс до броска (стр. 19, шаг 1). */
      contaminated: boolean;
      /** Промах: ответная Тяжёлая Травма Персонажу (стр. 19). */
      seriousWoundTaken: boolean;
      /** Персонаж погиб от ответной Травмы (стр. 21). */
      attackerDied: boolean;
      /** Стрелка Отступления у выжившего: розыгрыш направления по колоде Событий (стр. 20). */
      retreat?: IntruderRetreatRecord;
    }
  | {
      /** Чужой убит (стр. 20): миниатюра снята, Останки на полу (кроме Личинки). */
      type: 'INTRUDER_KILLED';
      playerId: string;
      roomId: RoomId;
      targetIntruderId: string;
      targetType: IntruderType;
      /** id объекта Останков в `room.objects`; Личинка Останков не оставляет. */
      remainsObjectId: string | null;
    }
  | { type: 'PLAYER_DIED'; playerId: string; roomId: RoomId }
  | { type: 'ESCAPE_PODS_UNLOCKED' }
  | {
      /** Отступление в бою (стр. 20): карта Событий задала направление Чужому. */
      type: 'INTRUDER_RETREATED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      retreat: IntruderRetreatRecord;
    }
  | { type: 'INTRUDERS_WITHDRAWN'; intruderIds: string[] }
  | { type: 'INTRUDERS_MOVED'; intruderIds: string[]; fromRoomId: RoomId; toRoomId: RoomId }
  | { type: 'INTRUDERS_BLOCKED_BY_DOOR'; intruderIds: string[]; corridorId: string }
  | { type: 'INTRUDER_TRANSFORMED'; intruderId: string; roomId: RoomId };

export type ContactPresentationEvent = Extract<
  IntruderLogEvent,
  {
    type:
      'CONTACT_OCCURRED' | 'SURPRISE_ATTACK_RESOLVED' | 'ESCAPE_ATTACK_RESOLVED' | 'SHOOT_RESOLVED' | 'MELEE_RESOLVED';
  }
>;
