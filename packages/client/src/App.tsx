import React from 'react';
import { TIME_TRACK_LENGTH } from '@nemesis/shared';
import type { RoomId } from '@nemesis/shared';
import { useGameStore } from './store/gameStore';
import { usePresentationStore } from './store/presentationStore';
import { ShipMapSVG } from './components/board/ShipMapSVG';
import { RoomInspector } from './components/inspector/RoomInspector';
import { SeedChip } from './components/hud/SeedChip';
import { CrewRoster } from './components/hud/CrewRoster';
import { InfectionScanOverlay } from './components/scanner/InfectionScanOverlay';
import { QuestUnlockCinematic } from './components/quests/QuestUnlockCinematic';
import { ObjectiveBriefing } from './components/objectives/ObjectiveBriefing';
import { SessionNotice } from './components/hud/SessionNotice';
import { EvacuationCinematic } from './components/evacuation/EvacuationCinematic';
import { ShipIntelCinematic } from './components/rooms/ShipIntelCinematic';
import { EscapePodConsole } from './components/evacuation/EscapePodConsole';
import { CryoChip } from './components/evacuation/CryoChip';
import { DevPanel } from './components/dev/DevPanel';
import { GameLogPanel } from './components/log/GameLogPanel';
import { PlayerHandPanel } from './components/hand/PlayerHandPanel';
import { DecisionModal } from './components/modals/DecisionModal';
import { CrewSetupFlow } from './components/lobby/CrewSetupFlow';
import { HandoffShutter } from './components/table/HandoffShutter';
import { BotActivity, BotTempoControl } from './components/table/BotTableHud';
import { ReactionBanner } from './components/reactions/ReactionDialogs';
import { useBotPacing } from './hooks/useBotPacing';
import { RadioButton } from './components/comms/RadioPanel';
import { EngineBroadcast } from './components/comms/EngineBroadcast';
import { EventPhaseBanner } from './components/events/EventPhaseBanner';
import { EventPhaseModal } from './components/events/EventPhaseModal';
import { buildEventPhaseModalModel } from './components/events/eventPhaseModalModel';
import { ShootModal } from './components/combat/ShootModal';
import { IntruderBoardButton } from './components/intruders/IntruderBoardButton';
import { IntruderBoardModal } from './components/intruders/IntruderBoardModal';
import { MeleeModal } from './components/combat/MeleeModal';
import { PHASE_LABELS } from './utils/labels';
import { IS_DEV } from './utils/env';
import { EndgameCinematic } from './components/endgame/EndgameCinematic';
import { RotateCcw, Clock, Shield, Bug, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const view = useGameStore((state) => state.view);
  const seating = useGameStore((state) => state.seating);
  const handoffTo = useGameStore((state) => state.handoffTo);
  const confirmHandoff = useGameStore((state) => state.confirmHandoff);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const isPresentationIdle = usePresentationStore((s) => s.isIdle);
  const [devPanelOpen, setDevPanelOpen] = React.useState(false);
  // Планшет Чужих: открытие — только кликом по кнопке HUD, F5 окно закрывает.
  const [intruderBoardOpen, setIntruderBoardOpen] = React.useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = React.useState(() => {
    return !view || view.gameLog.every((entry) => entry.event.type === 'GAME_STARTED');
  });
  useBotPacing(!showCharacterSelect);

  // Кинематографичная презентация Фазы Событий (Шаг 9): открывается один раз
  // на каждую Фазу (ключ — секвенс Сдвига Счётчиков Времени), повторные
  // обновления снимка её уже не тревожат. Закрытые фазы переживают F5:
  // ключи хранятся в sessionStorage по идентификатору партии, иначе после
  // обновления страницы модалка последней фазы открывалась заново.
  const eventPhaseModalModel = React.useMemo(() => (view ? buildEventPhaseModalModel(view) : null), [view]);
  const gameId = view?.meta.gameId ?? null;
  // Закрытия текущей сессии поверх sessionStorage: состояние меняется только
  // в обработчике закрытия, поэтому рендер остаётся чистым.
  const [sessionDismissedPhases, setSessionDismissedPhases] = React.useState<Record<string, number[]>>({});
  // null — партия ещё не загружена, модалки закрыты до первого снимка.
  const dismissedEventPhaseKeys = React.useMemo(() => {
    if (!gameId) return null;
    let persisted: number[] = [];
    try {
      const raw = window.sessionStorage.getItem(`nemesis:event-phase-dismissed:${gameId}`);
      if (raw) persisted = JSON.parse(raw) as number[];
    } catch {
      // Приватный режим без sessionStorage: держим закрытия только в памяти.
    }
    return [...new Set([...persisted, ...(sessionDismissedPhases[gameId] ?? [])])];
  }, [gameId, sessionDismissedPhases]);
  const [eventPhaseHighlightRoomIds, setEventPhaseHighlightRoomIds] = React.useState<readonly RoomId[]>([]);
  const eventPhaseModalOpen =
    dismissedEventPhaseKeys !== null &&
    eventPhaseModalModel !== null &&
    !dismissedEventPhaseKeys.includes(eventPhaseModalModel.phaseKey);

  const closeEventPhaseModal = () => {
    if (eventPhaseModalModel && gameId) {
      const phaseKey = eventPhaseModalModel.phaseKey;
      setSessionDismissedPhases((phases) => ({
        ...phases,
        [gameId]: [...new Set([...(phases[gameId] ?? []), phaseKey])],
      }));
      try {
        let persisted: number[] = [];
        const raw = window.sessionStorage.getItem(`nemesis:event-phase-dismissed:${gameId}`);
        if (raw) persisted = JSON.parse(raw) as number[];
        window.sessionStorage.setItem(
          `nemesis:event-phase-dismissed:${gameId}`,
          JSON.stringify([...new Set([...persisted, phaseKey])]),
        );
      } catch {
        // Игнорируем: воспроизведение фазы после F5 просто продолжится.
      }
    }
    setEventPhaseHighlightRoomIds([]);
  };

  const [hiddenEndgameIds, setHiddenEndgameIds] = React.useState<string[]>([]);
  const endgameHidden = gameId !== null && hiddenEndgameIds.includes(gameId);
  const hideEndgame = () => {
    if (gameId) setHiddenEndgameIds((ids) => [...ids, gameId]);
  };
  const showEndgame = () => setHiddenEndgameIds((ids) => ids.filter((id) => id !== gameId));

  if (!view) {
    return (
      <div className="relative w-screen h-screen bg-nemesis-bg flex items-center justify-center">
        <span className="font-mono text-sm text-slate-400">СИСТЕМЫ КОРАБЛЯ ЗАГРУЖАЮТСЯ…</span>
      </div>
    );
  }

  const activePlayerName = view.players[view.meta.activePlayerId]?.name ?? 'Экипаж';
  const seatLabelOf = (playerId: string) => seating.find((seat) => seat.playerId === playerId)?.label;
  const pendingDecisionIsBot =
    view.pendingDecisionPlayerId !== null &&
    seating.find((seat) => seat.playerId === view.pendingDecisionPlayerId)?.kind === 'BOT';

  return (
    <div className="relative w-screen h-screen bg-nemesis-bg flex flex-col overflow-hidden">
      {/* Верхний HUD */}
      <header className="h-14 bg-nemesis-hull/90 border-b border-nemesis-border px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Shield size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-heading tracking-widest text-white leading-none">
              NEMESIS <span className="text-cyan-400 text-sm">DIGITAL v{__APP_VERSION__}</span>
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              РАУНД {view.meta.currentRound} • {PHASE_LABELS[view.meta.phase]} • {activePlayerName.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Трек времени и кнопка рестарта */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-xs font-mono text-slate-300">
              ВРЕМЯ: <b className="text-white">{TIME_TRACK_LENGTH - view.meta.timeTrackPosition}</b>
            </span>
          </div>
          <CryoChip view={view} />
          <RadioButton view={view} />
          <BotTempoControl />
          {view.endgame && endgameHidden && (
            <button
              type="button"
              onClick={showEndgame}
              className="flex items-center gap-1.5 rounded border border-amber-500/60 bg-amber-950/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200 transition hover:bg-amber-900/60"
            >
              <Trophy size={14} aria-hidden="true" /> Итоги партии
            </button>
          )}

          {/* Планшет Чужих: живой бейдж «на борту» + точка «улей шевелился» */}
          <IntruderBoardButton view={view} open={intruderBoardOpen} onOpen={() => setIntruderBoardOpen(true)} />

          {/* Сид партии: виден игрокам, копируется по нажатию — по нему воспроизводится тот же стол */}
          <SeedChip seed={view.meta.seed} />

          {/* Кнопка отладочных инструментов: её нет в продакшн-сборке */}
          {IS_DEV && (
            <button
              onClick={() => setDevPanelOpen((open) => !open)}
              className={`p-2 rounded-lg transition ${
                devPanelOpen ? 'bg-cyan-900/60 text-cyan-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Dev-панель"
              aria-pressed={devPanelOpen}
            >
              <Bug size={16} />
            </button>
          )}

          <button
            onClick={() => setShowCharacterSelect(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-lg transition flex items-center gap-1.5 text-xs font-semibold"
            title="Новая партия: лобби и подготовка экипажа"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Новая игра</span>
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <section aria-label="Карта корабля" className="relative min-h-0 flex-1 overflow-hidden">
          <ShipMapSVG highlightRoomIds={eventPhaseModalOpen ? eventPhaseHighlightRoomIds : []} />
          <CrewRoster view={view} onSelectRoom={selectRoom} seating={seating} />
          <RoomInspector />
          {isPresentationIdle && !eventPhaseModalOpen && <EventPhaseBanner view={view} />}
        </section>
        <PlayerHandPanel view={view} />
        {isPresentationIdle && eventPhaseModalOpen && eventPhaseModalModel && (
          <EventPhaseModal
            view={view}
            model={eventPhaseModalModel}
            onClose={closeEventPhaseModal}
            onStepChange={setEventPhaseHighlightRoomIds}
          />
        )}
        {showCharacterSelect && (
          <CrewSetupFlow
            onClose={view.gameLog.length > 1 ? () => setShowCharacterSelect(false) : undefined}
            onLaunched={() => setShowCharacterSelect(false)}
          />
        )}
        {intruderBoardOpen && (
          <IntruderBoardModal
            view={view}
            onClose={() => setIntruderBoardOpen(false)}
            onNavigate={(roomId) => {
              setIntruderBoardOpen(false);
              selectRoom(roomId as RoomId);
            }}
          />
        )}
        {isPresentationIdle && view.pendingDecision && <DecisionModal decision={view.pendingDecision} />}
        {isPresentationIdle && view.pendingDecisionPlayerId && !view.pendingDecision && !pendingDecisionIsBot && (
          <div
            role="status"
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          >
            <p className="max-w-md rounded-xl border border-amber-700 bg-slate-900 p-6 text-center text-amber-100">
              Ожидается обязательное решение игрока{' '}
              {view.players[view.pendingDecisionPlayerId]?.name ?? view.pendingDecisionPlayerId}.
            </p>
          </div>
        )}
        <ObjectiveBriefing view={view} enabled={isPresentationIdle && !showCharacterSelect && !view.pendingDecision} />
        <SessionNotice />
        <ReactionBanner view={view} />
        <EngineBroadcast view={view} enabled={isPresentationIdle && !showCharacterSelect} />
        {!showCharacterSelect && <BotActivity view={view} />}
        <InfectionScanOverlay view={view} />
        <QuestUnlockCinematic view={view} />
        <EvacuationCinematic view={view} />
        <ShipIntelCinematic view={view} />
        {isPresentationIdle && <EscapePodConsole view={view} />}
        {isPresentationIdle && <ShootModal />}
        {isPresentationIdle && <MeleeModal />}
        {view.endgame && !endgameHidden && isPresentationIdle && !eventPhaseModalOpen && !showCharacterSelect && (
          <EndgameCinematic
            key={view.meta.gameId}
            view={view}
            report={view.endgame}
            onNewGame={() => setShowCharacterSelect(true)}
            onClose={hideEndgame}
          />
        )}

        {IS_DEV && devPanelOpen && <DevPanel onClose={() => setDevPanelOpen(false)} />}
        {handoffTo && !showCharacterSelect && (
          <HandoffShutter
            recipient={seatLabelOf(handoffTo) ?? view.players[handoffTo]?.name ?? handoffTo}
            detail={view.players[handoffTo]?.name}
            onReady={confirmHandoff}
          />
        )}
      </main>

      <GameLogPanel view={view} />
    </div>
  );
};

export default App;
