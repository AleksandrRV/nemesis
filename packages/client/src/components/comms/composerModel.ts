import type {
  CommsAddressee,
  CommsDraft,
  CourseMarker,
  Destination,
  EngineNumber,
  ItemNeed,
  SanitizedGameState,
} from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, KNOWN_ITEM_NAMES, SPECIAL_ROOMS } from '@nemesis/shared';
import { DESTINATION_LABELS } from '../endgame/endgameModel';
import { corridorLabel, playerName, roomLabel } from '../log/gameLogModel';

export type ComposerCategory = 'CLAIM' | 'INTENT' | 'REQUEST';

export type ComposerField =
  | 'engine'
  | 'engineStatus'
  | 'engineDeed'
  | 'marker'
  | 'destination'
  | 'toEarth'
  | 'room'
  | 'roomType'
  | 'item'
  | 'itemNeed'
  | 'pod'
  | 'player'
  | 'corridor'
  | 'doorState';

export interface ComposerValues {
  engine?: EngineNumber;
  engineStatus?: 'WORKING' | 'DAMAGED';
  engineDeed?: 'REPAIRED' | 'DAMAGED' | 'UNTOUCHED';
  marker?: CourseMarker;
  destination?: Destination;
  toEarth?: 'YES' | 'NO';
  room?: number;
  roomType?: string;
  item?: string;
  itemNeed?: ItemNeed;
  pod?: string;
  player?: string;
  corridor?: string;
  doorState?: 'OPEN' | 'CLOSED';
}

type Body<Kind extends ComposerCategory> = Extract<CommsDraft, { kind: Kind }>['body'];

interface TopicSpec<Kind extends ComposerCategory> {
  id: string;
  kind: Kind;
  label: string;
  fields: (values: ComposerValues) => ComposerField[];
  build: (values: Required<ComposerValues>) => Body<Kind>;
}

export type ComposerTopic = TopicSpec<'CLAIM'> | TopicSpec<'INTENT'> | TopicSpec<'REQUEST'>;

const only =
  (...fields: ComposerField[]) =>
  (): ComposerField[] =>
    fields;

const claim = (spec: Omit<TopicSpec<'CLAIM'>, 'kind'>): TopicSpec<'CLAIM'> => ({ ...spec, kind: 'CLAIM' });
const intent = (spec: Omit<TopicSpec<'INTENT'>, 'kind'>): TopicSpec<'INTENT'> => ({ ...spec, kind: 'INTENT' });
const request = (spec: Omit<TopicSpec<'REQUEST'>, 'kind'>): TopicSpec<'REQUEST'> => ({ ...spec, kind: 'REQUEST' });

/** Каталог фраз Рации (план 0.8.0, В8-4-2): только готовые конструкции, без свободного текста. */
export const COMPOSER_TOPICS: readonly ComposerTopic[] = [
  claim({
    id: 'engine-status',
    label: 'Двигатель исправен / сломан',
    fields: only('engine', 'engineStatus'),
    build: (v) => ({ topic: 'ENGINE_STATUS', engineNumber: v.engine, status: v.engineStatus }),
  }),
  claim({
    id: 'engine-deed',
    label: 'Я починил / повредил / не трогал',
    fields: only('engine', 'engineDeed'),
    build: (v) => ({ topic: 'ENGINE_DEED', engineNumber: v.engine, deed: v.engineDeed }),
  }),
  claim({
    id: 'coordinates',
    label: 'Координаты: маркер → пункт',
    fields: only('marker', 'destination'),
    build: (v) => ({ topic: 'COORDINATES', marker: v.marker, destination: v.destination }),
  }),
  claim({
    id: 'course',
    label: 'Курс ведёт к Земле / не к Земле',
    fields: only('toEarth'),
    build: (v) => ({ topic: 'COURSE', toEarth: v.toEarth === 'YES' }),
  }),
  claim({
    id: 'room-identity',
    label: 'Комната X — это Y',
    fields: only('room', 'roomType'),
    build: (v) => ({ topic: 'ROOM_IDENTITY', roomId: v.room, definitionId: v.roomType }),
  }),
  claim({ id: 'not-infected', label: 'Я не заражён', fields: only(), build: () => ({ topic: 'NOT_INFECTED' }) }),
  claim({
    id: 'has-item',
    label: 'У меня есть Предмет',
    fields: only('item'),
    build: (v) => ({ topic: 'HAS_ITEM', itemName: v.item }),
  }),
  intent({ id: 'explore', label: 'Исследую', fields: only(), build: () => ({ topic: 'EXPLORE' }) }),
  intent({
    id: 'seek-room',
    label: 'Ищу Комнату',
    fields: only('roomType'),
    build: (v) => ({ topic: 'SEEK_ROOM', definitionId: v.roomType }),
  }),
  intent({ id: 'engines', label: 'Иду к Двигателям', fields: only(), build: () => ({ topic: 'GO_TO_ENGINES' }) }),
  intent({ id: 'bridge', label: 'Иду на Мостик', fields: only(), build: () => ({ topic: 'GO_TO_BRIDGE' }) }),
  intent({ id: 'heal', label: 'Иду лечиться', fields: only(), build: () => ({ topic: 'GO_HEAL' }) }),
  intent({ id: 'hibernation', label: 'Иду в Анабиоз', fields: only(), build: () => ({ topic: 'GO_TO_HIBERNATION' }) }),
  intent({
    id: 'pod',
    label: 'Иду к Капсуле',
    fields: only('pod'),
    build: (v) => ({ topic: 'GO_TO_POD', podId: v.pod }),
  }),
  intent({
    id: 'cover',
    label: 'Прикрываю игрока',
    fields: only('player'),
    build: (v) => ({ topic: 'COVER_PLAYER', playerId: v.player }),
  }),
  intent({
    id: 'go-room',
    label: 'Иду в Комнату',
    fields: only('room'),
    build: (v) => ({ topic: 'GO_TO_ROOM', roomId: v.room }),
  }),
  request({
    id: 'need-item',
    label: 'Нужен Предмет',
    fields: (values) => (values.itemNeed === 'SPECIFIC' ? ['itemNeed', 'item'] : ['itemNeed']),
    build: (v) => ({
      topic: 'NEED_ITEM',
      need: v.itemNeed,
      ...(v.itemNeed === 'SPECIFIC' ? { itemName: v.item } : {}),
    }),
  }),
  request({
    id: 'help-kill',
    label: 'Помогите убить Чужого',
    fields: only('room'),
    build: (v) => ({ topic: 'HELP_KILL', roomId: v.room }),
  }),
  request({
    id: 'check-engine',
    label: 'Проверьте Двигатель',
    fields: only('engine'),
    build: (v) => ({ topic: 'CHECK_ENGINE', engineNumber: v.engine }),
  }),
  request({
    id: 'check-coordinates',
    label: 'Проверьте Координаты',
    fields: only(),
    build: () => ({ topic: 'CHECK_COORDINATES' }),
  }),
  request({
    id: 'door',
    label: 'Откройте / закройте Дверь',
    fields: only('corridor', 'doorState'),
    build: (v) => ({ topic: 'SET_DOOR', corridorId: v.corridor, doorState: v.doorState }),
  }),
  request({
    id: 'extinguish',
    label: 'Потушите Пожар',
    fields: only('room'),
    build: (v) => ({ topic: 'EXTINGUISH', roomId: v.room }),
  }),
  request({
    id: 'wait-pod',
    label: 'Подождите в Капсуле',
    fields: only('pod'),
    build: (v) => ({ topic: 'WAIT_IN_POD', podId: v.pod }),
  }),
  request({
    id: 'no-self-destruct',
    label: 'Не запускайте Самоуничтожение',
    fields: only(),
    build: () => ({ topic: 'NO_SELF_DESTRUCT' }),
  }),
];

export const COMPOSER_CATEGORY_LABELS: Record<ComposerCategory, string> = {
  CLAIM: 'Заявление',
  INTENT: 'Намерение',
  REQUEST: 'Просьба',
};

export function topicsOf(category: ComposerCategory): ComposerTopic[] {
  return COMPOSER_TOPICS.filter((topic) => topic.kind === category);
}

export function missingFields(topic: ComposerTopic, values: ComposerValues): ComposerField[] {
  return topic.fields(values).filter((field) => values[field] === undefined);
}

export function buildComposerDraft(
  topic: ComposerTopic,
  values: ComposerValues,
  to: CommsAddressee,
): CommsDraft | null {
  if (missingFields(topic, values).length > 0) return null;
  const complete = values as Required<ComposerValues>;
  switch (topic.kind) {
    case 'CLAIM':
      return { kind: 'CLAIM', to, body: topic.build(complete) };
    case 'INTENT':
      return { kind: 'INTENT', to, body: topic.build(complete) };
    case 'REQUEST':
      return { kind: 'REQUEST', to, body: topic.build(complete) };
  }
}

export interface ComposerOption<Value extends string | number> {
  value: Value;
  label: string;
  hint?: string;
}

const ROOM_TYPES = [...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS];

export const ITEM_NEED_OPTIONS: ComposerOption<ItemNeed>[] = [
  { value: 'WEAPON', label: 'Оружие' },
  { value: 'ENERGY_CHARGE', label: 'Энергозаряд' },
  { value: 'EXTENDED_MAGAZINE', label: 'Увеличенный магазин' },
  { value: 'HEALING', label: 'Лечение' },
  { value: 'SPECIFIC', label: 'Конкретный Предмет' },
];

export function roomOptions(view: SanitizedGameState): ComposerOption<number>[] {
  const viewerRoom = view.players[view.viewerId]?.roomId;
  return Object.values(view.ship.rooms)
    .sort((left, right) => left.id - right.id)
    .map((room) => ({
      value: room.id,
      label: roomLabel(view, room.id),
      hint: room.id === viewerRoom ? 'вы здесь' : undefined,
    }));
}

export function roomTypeOptions(): ComposerOption<string>[] {
  return ROOM_TYPES.map((room) => ({ value: room.id, label: room.name })).sort((left, right) =>
    left.label.localeCompare(right.label, 'ru'),
  );
}

export function itemOptions(): ComposerOption<string>[] {
  return [...KNOWN_ITEM_NAMES]
    .sort((left, right) => left.localeCompare(right, 'ru'))
    .map((name) => ({ value: name, label: name }));
}

export function podOptions(view: SanitizedGameState): ComposerOption<string>[] {
  return Object.values(view.ship.escapePods)
    .filter((pod) => !pod.isDestroyed && !pod.isLaunched)
    .sort((left, right) => left.number - right.number)
    .map((pod) => ({
      value: pod.id,
      label: `Капсула ${pod.number}`,
      hint: pod.isLocked ? 'заблокирована' : undefined,
    }));
}

export function playerOptions(view: SanitizedGameState): ComposerOption<string>[] {
  return Object.values(view.players)
    .filter((player) => player.id !== view.viewerId && !player.isDead && !player.hasEscapedInPod)
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .map((player) => ({ value: player.id, label: playerName(view, player.id), hint: `Игрок ${player.orderNumber}` }));
}

/** Сначала Двери Комнаты говорящего, затем остальные; Разрушенную Дверь просить нельзя. */
export function corridorOptions(view: SanitizedGameState): ComposerOption<string>[] {
  const viewerRoom = view.players[view.viewerId]?.roomId;
  const touchesViewer = (fromRoomId: number, toRoomId: number) => fromRoomId === viewerRoom || toRoomId === viewerRoom;
  return Object.values(view.ship.corridors)
    .filter((corridor) => corridor.doorState !== 'DESTROYED')
    .sort(
      (left, right) =>
        Number(touchesViewer(right.fromRoomId, right.toRoomId)) -
          Number(touchesViewer(left.fromRoomId, left.toRoomId)) || left.id.localeCompare(right.id),
    )
    .map((corridor) => ({
      value: corridor.id,
      label: `Коридор ${corridorLabel(corridor.id)} · #${corridor.fromRoomId}↔#${corridor.toRoomId}`,
      hint: touchesViewer(corridor.fromRoomId, corridor.toRoomId) ? 'у вашей Комнаты' : undefined,
    }));
}

export const DESTINATION_OPTIONS: ComposerOption<Destination>[] = (
  ['EARTH', 'MARS', 'VENUS', 'DEEP_SPACE'] as const
).map((destination) => ({ value: destination, label: DESTINATION_LABELS[destination] }));

export const MARKER_OPTIONS: ComposerOption<CourseMarker>[] = (['A', 'B', 'C', 'D'] as const).map((marker) => ({
  value: marker,
  label: marker,
}));
