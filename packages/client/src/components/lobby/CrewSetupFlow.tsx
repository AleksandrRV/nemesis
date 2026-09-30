import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { createSeed } from '../../services/session/seed';
import { HandoffShutter } from '../table/HandoffShutter';
import { rememberBriefingDismissed } from '../objectives/objectiveModel';
import { CrewBriefingScreen } from './CrewBriefingScreen';
import { LobbyScreen } from './LobbyScreen';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { WaitingRoomScreen } from './WaitingRoomScreen';
import { SimulationScreen } from '../simulation/SimulationScreen';
import {
  BOT_BOOT_MS,
  BOT_PICK_DELAY_MS,
  fillWithBots,
  initialWaitingSeats,
  localHumansInOrder,
  seatByPlayer,
  tableSeatsOf,
  toggleLocalSeat,
  type LobbyConfig,
  type WaitingSeat,
} from './lobbyModel';

type FlowStage = 'LOBBY' | 'WAITING' | 'BRIEFING' | 'ROLES' | 'SIMULATION';

interface CrewSetupFlowProps {
  onClose?: () => void;
  onLaunched: () => void;
}

export const CrewSetupFlow: React.FC<CrewSetupFlowProps> = ({ onClose, onLaunched }) => {
  const setup = useGameStore((state) => state.crewSetup);
  const pendingBotId = useGameStore((state) => state.pendingBotId);
  const setupRejection = useGameStore((state) => state.setupRejection);
  const store = useGameStore.getState;

  const [stage, setStage] = React.useState<FlowStage>('LOBBY');
  const [config, setConfig] = React.useState<LobbyConfig>(() => ({
    playerCount: 1,
    roleSelection: 'DRAFT',
    seed: createSeed(),
    botDifficulty: 'CREW',
  }));
  const [seats, setSeats] = React.useState<WaitingSeat[]>(() => initialWaitingSeats(1));
  const [booting, setBooting] = React.useState(false);
  const [briefingIndex, setBriefingIndex] = React.useState(0);
  const [acknowledgedViewer, setAcknowledgedViewer] = React.useState<string | null>(null);

  const humans = React.useMemo(() => (setup ? localHumansInOrder(setup) : []), [setup]);
  const hotSeat = humans.length > 1;
  const inSetup = stage === 'BRIEFING' || stage === 'ROLES';
  const shutterFor = setup && inSetup && hotSeat && setup.viewerId !== acknowledgedViewer ? setup.viewerId : null;

  const goToWaiting = () => {
    setSeats(initialWaitingSeats(config.playerCount));
    setStage('WAITING');
  };

  const start = () => {
    setBooting(true);
    setSeats((current) => fillWithBots(current));
    window.setTimeout(() => {
      store().beginCrewSetup({
        seed: config.seed.trim(),
        seats: tableSeatsOf(seats, config.botDifficulty),
        roleSelection: config.roleSelection,
      });
      const first = store().crewSetup;
      const firstHuman = first ? localHumansInOrder(first)[0] : undefined;
      if (firstHuman) store().viewCrewSetupAs(firstHuman);
      setBooting(false);
      setBriefingIndex(0);
      setAcknowledgedViewer(null);
      setStage('BRIEFING');
    }, BOT_BOOT_MS);
  };

  const finishBriefing = () => {
    const next = humans[briefingIndex + 1];
    if (next) {
      store().viewCrewSetupAs(next);
      setBriefingIndex(briefingIndex + 1);
      return;
    }
    const picker = setup?.currentPicker;
    if (picker && humans.includes(picker)) store().viewCrewSetupAs(picker);
    setStage('ROLES');
  };

  React.useEffect(() => {
    if (stage !== 'ROLES' || !pendingBotId || shutterFor) return undefined;
    const timer = window.setTimeout(() => store().stepBot(), BOT_PICK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [stage, pendingBotId, shutterFor, setup, store]);

  const cancel = () => {
    store().cancelCrewSetup();
    setStage('LOBBY');
  };

  const launch = () => {
    store().launchCrew();
    const gameId = store().view?.meta.gameId;
    if (gameId) rememberBriefingDismissed(gameId);
    onLaunched();
  };

  const shutterSeat = setup && shutterFor ? seatByPlayer(setup, shutterFor) : null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.06)_1px,transparent_1px)] bg-[size:48px_48px] motion-safe:animate-lobby-grid-drift"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,rgba(34,211,238,0.10),transparent_18%)] motion-safe:animate-lobby-radar"
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.95)_85%)]" />

      {onClose && (stage === 'LOBBY' || stage === 'WAITING') && (
        <button
          type="button"
          onClick={onClose}
          className="fixed right-4 top-4 z-10 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X size={20} aria-hidden="true" />
          <span className="sr-only">Вернуться к партии</span>
        </button>
      )}
      {(stage === 'BRIEFING' || stage === 'ROLES') && setup && !setup.isReady && (
        <button
          type="button"
          onClick={cancel}
          className="fixed left-4 top-4 z-10 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          Отменить подготовку
        </button>
      )}

      <div className="relative flex min-h-full items-center justify-center px-4 py-16">
        {stage === 'LOBBY' && (
          <LobbyScreen
            config={config}
            onChange={setConfig}
            onRerollSeed={() => setConfig((current) => ({ ...current, seed: createSeed() }))}
            onContinue={goToWaiting}
            onSimulate={() => setStage('SIMULATION')}
          />
        )}
        {stage === 'SIMULATION' && <SimulationScreen onBack={() => setStage('LOBBY')} />}
        {stage === 'WAITING' && (
          <WaitingRoomScreen
            seats={seats}
            booting={booting}
            onToggleSeat={(seatIndex) => setSeats((current) => toggleLocalSeat(current, seatIndex))}
            onBack={() => setStage('LOBBY')}
            onStart={start}
          />
        )}
        {stage === 'BRIEFING' && setup && !shutterFor && (
          <CrewBriefingScreen
            setup={setup}
            isLastBriefing={briefingIndex === humans.length - 1}
            onDone={finishBriefing}
          />
        )}
        {stage === 'ROLES' && setup && !shutterFor && (
          <RoleSelectionScreen
            setup={setup}
            onPick={(role) => store().pickRole(role)}
            onTimeout={() => store().pickRandomRole()}
            onLaunch={launch}
          />
        )}
      </div>

      {setupRejection && (
        <p
          role="alert"
          className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-500/60 bg-red-950/90 px-4 py-2 text-xs text-red-100"
        >
          <AlertTriangle size={14} aria-hidden="true" /> {setupRejection}
        </p>
      )}
      {shutterSeat && (
        <HandoffShutter
          recipient={shutterSeat.label}
          detail={`Игрок №${shutterSeat.orderNumber}`}
          onReady={() => setAcknowledgedViewer(shutterFor)}
        />
      )}
    </div>
  );
};
