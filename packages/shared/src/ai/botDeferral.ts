import type { RoomId } from '../types/rooms.js';
import type { Candidate } from './botCandidates.js';
import { isRelocation } from './botForecast.js';
import { handOf } from './botHand.js';
import type { GoalRoom } from './botNavigation.js';
import { roundsLeft } from './botRisk.js';
import { shelterAccess, shelterRoute, type ShelterRoute } from './botShelter.js';
import type { BotTask } from './botTasks.js';
import type { ThreatContext } from './botThreat.js';

/** Укрытие из повестки: его вес в долях гибели и где оно может быть. */
export interface ShelterPlan {
  kind: BotTask['kind'];
  stake: number;
  goals: readonly GoalRoom[];
}

interface OutlookContext {
  threat: ThreatContext;
  riskAversion: number;
  routes: Map<string, ShelterRoute | null>;
  access: Map<RoomId, number>;
}

function routeOf(context: OutlookContext, from: RoomId, shelter: RoomId): ShelterRoute | null {
  const key = `${from}>${shelter}`;
  if (!context.routes.has(key)) {
    context.routes.set(key, shelterRoute(context.threat, from, shelter, context.riskAversion));
  }
  return context.routes.get(key)!;
}

function accessOf(context: OutlookContext, shelter: RoomId): number {
  if (!context.access.has(shelter)) context.access.set(shelter, shelterAccess(context.threat, shelter));
  return context.access.get(shelter)!;
}

/**
 * Карты, которыми бот ещё сыграет до Прыжка или взрыва (стр. 11, 18): остаток руки после Действия и полная рука в
 * каждом следующем раунде. Пас отдаёт остаток этого раунда.
 */
function cardBudget(context: OutlookContext, candidate: Candidate): number {
  const { view, self } = context.threat;
  const later = self.handLimit * Math.max(0, roundsLeft(view) - 1);
  if (candidate.kind === 'PASS') return later;
  return Math.max(0, handOf(view, self.id).length - (candidate.cardsUsed ?? 0)) + later;
}

function reachesShelter(candidate: Candidate, plan: ShelterPlan): boolean {
  return candidate.effects.some((produced) => produced.kind === plan.kind);
}

/**
 * Перспектива укрыться после Действия: шанс дойти до укрытия и выполнить его Действие Комнаты — вред оставшегося
 * пути, доступность укрытия и карты до Прыжка на каждое Движение и само Действие. Пас откладывает путь на раунд, а
 * опасность пути за раунд растёт.
 */
function outlook(context: OutlookContext, candidate: Candidate, plan: ShelterPlan): number {
  if (reachesShelter(candidate, plan)) return 1;
  const { tuning, self } = context.threat;
  const from = isRelocation(candidate) ? candidate.roomId : self.roomId;
  const budget = cardBudget(context, candidate);
  const growth = candidate.kind === 'PASS' ? 1 + tuning.tactics.deferral.routeGrowth : 1;
  return plan.goals.reduce((best, goal) => {
    const route = routeOf(context, from, goal.roomId);
    if (!route || route.moves + 1 > budget) return best;
    const arrival = Math.max(0, 1 - route.harm * growth) * accessOf(context, goal.roomId);
    return Math.max(best, goal.probability * arrival);
  }, 0);
}

/**
 * Цена откладывания укрытия (стр. 11: кто не укрылся к Прыжку, гибнет): доля лучшей перспективы укрыться, которую
 * Действие теряет, × вес укрытия в долях гибели. Действие на лучшем пути не теряет ничего; Пас, после которого не
 * успеть, теряет всё укрытие. Это цена следующих раундов: Прыжок в конце последнего уже в прогнозе вреда.
 */
export function deferralCosts(
  threat: ThreatContext,
  plans: readonly ShelterPlan[],
  candidates: readonly Candidate[],
  riskAversion: number,
): Map<Candidate, number> {
  const costs = new Map<Candidate, number>();
  const weight = threat.tuning.tactics.deferral.weight;
  if (plans.length === 0 || weight === 0 || roundsLeft(threat.view) <= 1) return costs;
  const context: OutlookContext = { threat, riskAversion, routes: new Map(), access: new Map() };
  const prospects = candidates.map((candidate) =>
    plans.reduce(
      (top, plan) => {
        const value = plan.stake * outlook(context, candidate, plan);
        return value > top.value ? { value, stake: plan.stake } : top;
      },
      { value: 0, stake: 0 },
    ),
  );
  const best = prospects.reduce((top, prospect) => (prospect.value > top.value ? prospect : top), prospects[0]!);
  if (!best || best.value === 0) return costs;
  candidates.forEach((candidate, index) => {
    costs.set(candidate, weight * best.stake * (1 - prospects[index]!.value / best.value));
  });
  return costs;
}
