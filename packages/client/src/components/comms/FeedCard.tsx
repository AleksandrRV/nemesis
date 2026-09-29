import React from 'react';
import type { CommitmentStatus, CommsKind } from '@nemesis/shared';
import {
  AlertTriangle,
  Check,
  Eye,
  Footprints,
  Hand,
  Heart,
  MapPin,
  MessageSquareReply,
  Ship,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { COMMITMENT_STATUS_LABELS, COMMS_KIND_LABELS } from './commsPhrases';
import type { FeedAnswer, FeedItem } from './commsFeedModel';

const KIND_STYLES: Record<CommsKind, { icon: LucideIcon; chip: string; frame: string }> = {
  SYSTEM: { icon: AlertTriangle, chip: 'bg-amber-500/20 text-amber-200', frame: 'border-amber-500/60 bg-amber-950/40' },
  CLAIM: { icon: Eye, chip: 'bg-cyan-500/15 text-cyan-200', frame: 'border-slate-700 bg-slate-900/80' },
  INTENT: { icon: Footprints, chip: 'bg-emerald-500/15 text-emerald-200', frame: 'border-slate-700 bg-slate-900/80' },
  REQUEST: { icon: Hand, chip: 'bg-violet-500/20 text-violet-200', frame: 'border-violet-500/50 bg-violet-950/30' },
  ANSWER: { icon: MessageSquareReply, chip: 'bg-slate-700 text-slate-200', frame: 'border-slate-700 bg-slate-900/80' },
  REACTION: { icon: ThumbsDown, chip: 'bg-rose-500/15 text-rose-200', frame: 'border-slate-700 bg-slate-900/80' },
};

const STATUS_STYLES: Record<CommitmentStatus, string> = {
  OPEN: 'border-slate-500 text-slate-200',
  FULFILLED: 'border-emerald-400 text-emerald-300',
  BROKEN: 'border-red-500 text-red-300',
  EXPIRED: 'border-amber-500 text-amber-300',
};

export const CommitmentStamp: React.FC<{ status: CommitmentStatus }> = ({ status }) => (
  <span
    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]} ${
      status === 'OPEN' ? '' : 'motion-safe:animate-stamp-in'
    }`}
  >
    {COMMITMENT_STATUS_LABELS[status]}
  </span>
);

const Avatar: React.FC<{ item: FeedItem; onOpenDossier: (playerId: string) => void }> = ({ item, onOpenDossier }) => {
  if (!item.authorClass || !item.authorId) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/70 bg-amber-950/60">
        <Ship size={16} className="text-amber-300" aria-hidden="true" />
      </span>
    );
  }
  const identity = CREW_IDENTITIES[item.authorClass];
  const authorId = item.authorId;
  return (
    <button
      type="button"
      onClick={() => onOpenDossier(authorId)}
      title={`Досье: ${item.authorName}`}
      style={{ borderColor: identity.color }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950 transition hover:scale-110"
    >
      <identity.Icon size={16} color={identity.color} aria-hidden="true" />
      <span className="sr-only">Досье: {item.authorName}</span>
    </button>
  );
};

const AnswerRow: React.FC<{ answer: FeedAnswer }> = ({ answer }) => (
  <li className="flex items-center justify-between gap-2 text-[11px]">
    <span className="text-slate-300">
      <b className="text-white">{answer.authorName}</b>: {answer.willHelp ? 'помогу' : 'не могу'}
    </span>
    {answer.commitment && <CommitmentStamp status={answer.commitment.status} />}
  </li>
);

const SmallAction: React.FC<{ icon: LucideIcon; label: string; onClick: () => void; tone?: string }> = ({
  icon: Icon,
  label,
  onClick,
  tone = 'text-slate-400 hover:text-white',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1 text-[10px] font-semibold transition ${tone}`}
  >
    <Icon size={11} aria-hidden="true" /> {label}
  </button>
);

export interface FeedCardHandlers {
  onAnswer: (requestId: string, willHelp: boolean) => void;
  onReact: (messageId: string, reaction: 'DISBELIEVE' | 'THANKS') => void;
  onShowOnMap: (roomId: number) => void;
  onOpenDossier: (playerId: string) => void;
}

export const FeedCard: React.FC<{ item: FeedItem; round: number; isNew: boolean } & FeedCardHandlers> = ({
  item,
  round,
  isNew,
  onAnswer,
  onReact,
  onShowOnMap,
  onOpenDossier,
}) => {
  const style = KIND_STYLES[item.kind];
  const mapRoomId = item.mapRoomId;
  const hasActions = mapRoomId !== null || item.canDisbelieve || item.canThank;
  return (
    <li
      className={`flex gap-2.5 rounded-xl border p-2.5 ${style.frame} ${item.isForViewer ? 'ring-1 ring-cyan-400/60' : ''} ${
        isNew ? 'motion-safe:animate-lobby-rise' : ''
      }`}
    >
      <Avatar item={item} onOpenDossier={onOpenDossier} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <b className="text-xs text-white">{item.authorName}</b>
          <span className="text-slate-500">→ {item.addressee}</span>
          <span
            className={`ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider ${style.chip}`}
          >
            <style.icon size={10} aria-hidden="true" /> {COMMS_KIND_LABELS[item.kind]}
          </span>
        </div>
        <p
          className={`mt-1 text-sm leading-snug ${item.kind === 'SYSTEM' ? 'font-semibold text-amber-100' : 'text-slate-100'}`}
        >
          {item.text}
        </p>
        {hasActions && (
          <div className="mt-1.5 flex flex-wrap gap-3">
            {mapRoomId !== null && (
              <SmallAction
                icon={MapPin}
                label="На карте"
                onClick={() => onShowOnMap(mapRoomId)}
                tone="text-cyan-300 hover:text-cyan-100"
              />
            )}
            {item.canDisbelieve && (
              <SmallAction
                icon={ThumbsDown}
                label="Не верю"
                onClick={() => onReact(item.id, 'DISBELIEVE')}
                tone="text-rose-300 hover:text-rose-100"
              />
            )}
            {item.canThank && <SmallAction icon={Heart} label="Спасибо" onClick={() => onReact(item.id, 'THANKS')} />}
          </div>
        )}
        {item.request && (
          <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-1.5">
            <p className="text-[10px] text-slate-400">
              {item.request.isOpen
                ? `Срок — до конца раунда ${item.request.expiresAtRound}${item.request.expiresAtRound === round ? ' (последний)' : ''}`
                : 'Срок истёк'}
            </p>
            {item.request.answers.length > 0 && (
              <ul className="space-y-1">
                {item.request.answers.map((answer, index) => (
                  <AnswerRow key={`${answer.authorName}-${index}`} answer={answer} />
                ))}
              </ul>
            )}
            {item.request.canAnswer && (
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onAnswer(item.id, true)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold uppercase text-slate-950 transition hover:bg-emerald-500"
                >
                  <Check size={12} aria-hidden="true" /> Помогу
                </button>
                <button
                  type="button"
                  onClick={() => onAnswer(item.id, false)}
                  className="rounded-lg border border-slate-600 bg-slate-800 py-1.5 text-[11px] font-bold uppercase text-slate-200 transition hover:bg-slate-700"
                >
                  Не могу
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
