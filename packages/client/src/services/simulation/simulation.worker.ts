import {
  failureReason,
  finishSeries,
  runSeriesGame,
  runSingleGame,
  type SimulationRequest,
  type SimulationResponse,
} from './simulationJobs';

/** Web Worker симулятора: партии ботов идут вне потока интерфейса, окно не замирает. */
function reply(response: SimulationResponse): void {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  const request = event.data;
  try {
    if (request.kind === 'SINGLE') {
      reply({ kind: 'SINGLE_DONE', record: runSingleGame(request) });
      return;
    }
    const records = [];
    for (let index = 0; index < request.count; index++) {
      records.push(runSeriesGame(request, index));
      reply({ kind: 'PROGRESS', done: index + 1, total: request.count });
    }
    reply(finishSeries(request, records));
  } catch (error) {
    reply({ kind: 'FAILED', reason: failureReason(error) });
  }
};
