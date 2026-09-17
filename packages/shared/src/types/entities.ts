export type CharacterClass = 
  | 'CAPTAIN' 
  | 'PILOT' 
  | 'SCIENTIST' 
  | 'SCOUT' 
  | 'SOLDIER' 
  | 'MECHANIC';

export type IntruderType = 
  | 'LARVA' 
  | 'CREEPER' 
  | 'ADULT' 
  | 'BREEDER' 
  | 'QUEEN';

export interface IntruderToken {
  id: string;
  type: IntruderType | 'BLANK';
  escapeNumber: number; // Число на обратной стороне жетона (1..4) для внезапной атаки
}

export interface IntruderEntity {
  id: string;
  type: IntruderType;
  roomId: number;
  woundsCount: number;
}

export type ItemColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE' | 'QUEST' | 'STARTING';

export interface ItemCard {
  id: string;
  name: string;
  color: ItemColor;
  isHeavy: boolean;
  isSingleUse: boolean;
  componentSymbols: ('MEDICAL' | 'TECH')[];
  actionCost: number;
  description: string;
}

export interface ContaminationCard {
  id: string;
  cardCode: string;
  isInfected: boolean;
  isScanned: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  characterClass: CharacterClass;
  orderNumber: number;
  roomId: number;
  handCardsCount: number;
  lightWounds: number; // 0..2
  seriousWounds: string[]; // Типы тяжелых травм
  hasSlime: boolean;
  hasSignalSent: boolean;
  isInHibernation: boolean;
  hasEscapedInPod: boolean;
  isDead: boolean;
  hasPassed: boolean;
  actionsPerformedThisRound: number;
  inspectedEngines: (1 | 2 | 3)[];
  inspectedCoordinates: boolean;
}