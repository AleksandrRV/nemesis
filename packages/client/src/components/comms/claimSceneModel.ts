import type { ShipIntelScene } from '../rooms/shipIntelScenes';

export type ClaimableScene = Extract<
  ShipIntelScene,
  { kind: 'ENGINES' | 'ENGINE_TOGGLED' | 'COORDINATES' | 'OBSERVATION' }
>;

export function isClaimableScene(scene: ShipIntelScene): scene is ClaimableScene {
  return ['ENGINES', 'ENGINE_TOGGLED', 'COORDINATES', 'OBSERVATION'].includes(scene.kind);
}
