/** Настройки Рации (решение владельца Р-9): Рация — домашнее правило цифровой версии, в книге правил её нет. */
export interface CommsSettings {
  ordinaryMessagesPerTurn: number;
  requestsPerTurn: number;
  requestLifetimeRounds: number;
}

export const COMMS_SETTINGS = {
  ordinaryMessagesPerTurn: 3,
  requestsPerTurn: 1,
  requestLifetimeRounds: 2,
} as const satisfies CommsSettings;
