import { randomUUID } from 'node:crypto';
import type { IpcMain } from 'electron';
import { normalizeExploreExecutionConfirmRequest, normalizeHandoffContext, type ExploreAnalysisStartResult, type ExploreExecutionStartResult, type ExplorePlanStartResult, type ExploreRequest, type SourceEvidence } from '../common/explore';
import { getExploreHandoffArtifact } from './explore-session';
import type { Orchestrator } from './worker/orchestrator';
import { searchForExplore } from './explore-zhihu-search';
import { requireActiveProject } from './project-session';

let exploreRequestsInFlight = 0;

export function isExploreRequestInFlight(): boolean {
  return exploreRequestsInFlight > 0;
}

export function registerExploreAnalysisIpc(
  registrar: Pick<IpcMain, 'handle'>,
  orchestrator: Pick<Orchestrator, 'submitExploreAnalysis' | 'submitExplorePlan' | 'confirmExploreExecution'>,
  search = searchForExplore,
  requireProject = requireActiveProject,
  getArtifact = getExploreHandoffArtifact,
): void {
  registrar.handle('explore:analysis:start', async (_event, value: unknown): Promise<ExploreAnalysisStartResult> => {
    const project = requireProject();
    exploreRequestsInFlight += 1;
    try {
      const found: { request: ExploreRequest; sources: SourceEvidence[] } = await search(value);
      if (requireProject().id !== project.id) throw new Error('探索期间当前工程已改变，请重新发起分析');
      const requestId = randomUUID();
      const submitted = orchestrator.submitExploreAnalysis(found.request, requestId, undefined, found.sources);
      return {
        ok: true,
        taskId: submitted.taskId,
        requestId,
        disposition: submitted.disposition === 'queued' ? 'queued' : 'started',
        sourceCount: found.sources.length,
      };
    } finally {
      exploreRequestsInFlight -= 1;
    }
  });
  registrar.handle('explore:handoff:execute', async (_event, value: unknown): Promise<ExploreExecutionStartResult> => {
    requireProject();
    const confirmation = normalizeExploreExecutionConfirmRequest(value);
    const artifact = getArtifact(confirmation.sessionId);
    if (artifact.digest !== confirmation.artifactDigest || artifact.handoffId !== confirmation.handoffId || artifact.planRequestId !== confirmation.planRequestId) {
      throw new Error('确认提交的交接材料与工程文件不匹配');
    }
    const submitted = orchestrator.confirmExploreExecution(confirmation);
    return {
      ok: true,
      taskId: submitted.taskId,
      disposition: submitted.disposition === 'queued' ? 'queued' : 'started',
    };
  });
  registrar.handle('explore:handoff:plan', async (_event, value: unknown): Promise<ExplorePlanStartResult> => {
    requireProject();
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
