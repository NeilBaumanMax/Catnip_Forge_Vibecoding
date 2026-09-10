export interface ProjectSummary {
  id: string;
  name: string;
  projectDir: string;
  relativePath: string;
  available: boolean;
  lastOpenedAt?: string;
}

export interface ProjectSessionStatus {
  projectsRoot: string;
  activeProject: ProjectSummary | null;
  suggestedProjectId: string | null;
  projects: ProjectSummary[];
}

export type ExploreWorkStatus =
  | 'draft'
  | 'analyzing'
  | 'result_ready'
  | 'planning'
  | 'awaiting_confirmation'
  | 'execution_queued'
  | 'interrupted'
  | 'error';

export interface ExploreWorkSessionSummary {
  id: string;
  projectId: string;
  mode: 'idea' | 'diagnosis';
  title: string;
  status: ExploreWorkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExploreWorkSessionSnapshot {
  input: string;
  selectedContextIds: string[];
  selectedKnowledgeIds: string[];
  analysisRequest: ExploreRequest | null;
  analysisResult: ExploreAnalysisResult | null;
  planResult: Extract<ExploreAnalysisResult, { mode: 'plan' }> | null;
  planHandoff: HandoffContext | null;
  selectedIdeaId: string;
  editingInput: boolean;
  gatheredContext: ExploreContextGatherResult | null;
  analysisTaskId: string | null;
  analysisRequestId: string | null;
  planTaskId: string | null;
  planRequestId: string | null;
  executionStarted: boolean;
  executionTaskId: string | null;
  executionDisposition: 'started' | 'queued' | null;
  notice: string;
  displayStage: 'describe' | 'analyze' | 'plan' | 'execute';
  conversation: ExploreConversationMessage[];
  handoffArtifact: ExploreHandoffArtifact | null;
}

export interface ExploreConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  kind: 'request' | 'status' | 'result' | 'plan' | 'handoff' | 'execution' | 'error';
  text: string;
  createdAt: string;
  requestId?: string;
  taskId?: string;
}

export interface ExploreHandoffArtifact {
  version: 1;
  projectId: string;
  sessionId: string;
  mode: 'idea' | 'diagnosis';
  handoffId: string;
  planRequestId: string;
  digest: string;
  relativeDir: string;
  planMarkdown: string;
  handoffMarkdown: string;
  createdAt: string;
}

export interface ExploreWorkSessionRecord extends ExploreWorkSessionSummary {
  version: 1;
  snapshot: ExploreWorkSessionSnapshot;
}
import type { ExploreAnalysisResult, ExploreContextGatherResult, ExploreRequest, HandoffContext } from './explore';
