import React from 'react';
import type { RoomId, SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { CrewToken } from '../board/CrewToken';
import { crewTokenLabel, isCrewOnBoard, toCrewToken } from '../board/crewTokenModel';

interface CrewRosterProps {
  view: SanitizedGameState;
  onSelectRoom: (roomId: RoomId) => void;
}

function statusLabel(player: SanitizedGameState['players'][string], isActive: boolean): string | null {
  if (player.isDead) return 'ПОГИБ';
  if (player.hasEscapedInPod) return 'СПАССЯ';
  if (isActive) return 'ХОД';
  if (player.hasPassed) return 'ПАС';
  return null;
}

export const CrewRoster: React.FC<CrewRosterProps> = ({ view, onSelectRoom }) => {
  const players = Object.values(view.players).sort((a, b) => a.orderNumber - b.orderNumber);
  if (players.length === 0) return null;

  return (
    <nav
      aria-label="Экипаж: роли и номера игроков"
      className="absolute left-16 top-4 z-20 flex max-w-[calc(100%-5rem)] flex-wrap gap-1.5 md:max-w-[calc(100%-30rem)]"
    >
      {players.map((player) => {
        const token = toCrewToken(view, player.id);
        if (!token) return null;
        const identity = CREW_IDENTITIES[player.characterClass];
        const onBoard = isCrewOnBoard(player);
        const status = statusLabel(player, token.isActive);
        return (
          <button
            key={player.id}
            type="button"
            disabled={!onBoard}
            onClick={() => onSelectRoom(player.roomId)}
            title={onBoard ? `${crewTokenLabel(token)} — показать отсек` : crewTokenLabel(token)}
            aria-current={token.isActive ? 'true' : undefined}
            className={`flex min-h-9 items-center gap-1.5 rounded-lg border bg-nemesis-hull/90 py-1 pl-1 pr-2 text-left shadow-lg backdrop-blur transition hover:brightness-125 active:scale-95 disabled:cursor-default disabled:opacity-50 ${
              token.isActive ? 'border-current' : 'border-nemesis-border'
            }`}
            style={{ color: identity.color }}
          >
            <svg viewBox="-13 -13 26 26" className="h-7 w-7 shrink-0" aria-hidden="true">
              <CrewToken token={token} showActiveRing={false} />
            </svg>
            <span className="flex flex-col leading-none">
              <span className="font-mono text-[9px] text-slate-400">ИГРОК {player.orderNumber}</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${player.isDead ? 'line-through' : ''}`}>
                {identity.label}
              </span>
            </span>
            {status && (
              <span
                className={`ml-0.5 rounded px-1 py-0.5 font-mono text-[9px] font-bold ${
                  token.isActive ? 'bg-current' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span className={token.isActive ? 'text-slate-950' : undefined}>{status}</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
