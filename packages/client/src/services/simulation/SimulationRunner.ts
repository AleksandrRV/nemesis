import {
  failureReason,
  finishSeries,
  runSeriesGame,
  runSingleGame,
  type SimulationRequest,
  type SimulationResponse,
} from './simulationJobs';

export interface SimulationJob {
  cancel(): void;
}

export type SimulationListener = (response: SimulationResponse) => void;

function startInWorker(request: SimulationRequest, listen: SimulationListener): SimulationJob {
  const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<SimulationResponse>) => {
    listen(event.data);
    if (event.data.kind !== 'PROGRESS') worker.terminate();
  };
  worker.onerror = (event) => {
    listen({ kind: 'FAILED', reason: event.message || 'Симулятор остановился с ошибкой.' });
    worker.terminate();
  };
  worker.postMessage(request);
  return { cancel: () => worker.terminate() };
}

/** Без Web Worker (тесты, старый браузер): по одной партии за такт, интерфейс успевает отрисовать прогресс. */
function startInline(request: SimulationRequest, listen: SimulationListener, schedule: Scheduler): SimulationJob {
  let cancelled = false;
  const guard = (step: () => void) => () => {
    if (cancelled) return;
    try {
      step();
    } catch (error) {
      listen({ kind: 'FAILED', reason: failureReason(error) });
    }
  };
  if (request.kind === 'SINGLE') {
    schedule(guard(() => listen({ kind: 'SINGLE_DONE', record: runSingleGame(request) })));
  } else {
    const records: ReturnType<typeof runSeriesGame>[] = [];
    const next = guard(() => {
      records.push(runSeriesGame(request, records.length));
      listen({ kind: 'PROGRESS', done: records.length, total: request.count });
      if (records.length < request.count) schedule(next);
      else listen(finishSeries(request, records));
    });
    schedule(next);
  }
  return {
    cancel: () => {
      cancelled = true;
    },
  };
}

export type Scheduler = (task: () => void) => void;

const nextTick: Scheduler = (task) => void setTimeout(task, 0);

export function startSimulation(
  request: SimulationRequest,
  listen: SimulationListener,
  options: { useWorker?: boolean; schedule?: Scheduler } = {},
): SimulationJob {
  const useWorker = options.useWorker ?? typeof Worker !== 'undefined';
  return useWorker ? startInWorker(request, listen) : startInline(request, listen, options.schedule ?? nextTick);
}
