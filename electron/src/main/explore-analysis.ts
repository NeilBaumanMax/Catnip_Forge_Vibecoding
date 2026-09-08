import { randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import { normalizeHandoffContext, type ExploreAnalysisStartResult, type ExplorePlanStartResult, type ExploreRequest, type SourceEvidence } from '../common/explore';
import type { Orchestrator } from './worker/orchestrator';
import { searchForExplore } from './explore-zhihu-search';

export function registerExploreAnalysisIpc(
  registrar: Pick<IpcMain, 'handle'>,
  orchestrator: Pick<Orchestrator, 'submitExploreAnalysis' | 'submitExplorePlan'>,
  search = searchForExplore,
): void {
  registrar.handle('explore:analysis:start', async (_event, value: unknown): Promise<ExploreAnalysisStartResult> => {
    const found: { request: ExploreRequest; sources: SourceEvidence[] } = await search(value);
    const requestId = randomUUID();
    const submitted = orchestrator.submitExploreAnalysis(found.request, requestId, undefined, found.sources);
    return {
      ok: true,
      taskId: submitted.taskId,
      requestId,
      disposition: submitted.disposition === 'queued' ? 'queued' : 'started',
      sourceCount: found.sources.length,
    };
  });
  registrar.handle('explore:handoff:plan', async (_event, value: unknown): Promise<ExplorePlanStartResult> => {
    const handoff = normalizeHandoffContext(value);
    const requestId = randomUUID();
    const submitted = orchestrator.submitExplorePlan(handoff, requestId);
    return {
      ok: true,
      taskId: submitted.taskId,
      requestId,
      disposition: submitted.disposition === 'queued' ? 'queued' : 'started',
    };
  });
}
