import type { IdeaCollectorArtifact } from "./idea-collector-artifact";
import type { IdeaContractSnapshot } from "./idea-collector-contract";

export type WorkflowStageId = "description" | "virtual_simulation";

export class IdeaCollectorSessionState {
  private readonly activeSessions = new Set<string>();
  private readonly artifacts = new Map<string, IdeaCollectorArtifact>();
  private readonly noticesSent = new Set<string>();
  private readonly pendingQuestionnaire = new Set<string>();
  private readonly lastAssistantMessages = new Map<string, string>();
  private readonly outputPathsBySession = new Map<
    string,
    IdeaContractSnapshot["outputPaths"]
  >();
  private readonly sessionStages = new Map<string, WorkflowStageId>();

  isActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  markActive(sessionId: string): void {
    this.activeSessions.add(sessionId);
  }

  isQuestionnairePending(sessionId: string): boolean {
    return this.pendingQuestionnaire.has(sessionId);
  }

  markQuestionnairePending(sessionId: string): void {
    this.pendingQuestionnaire.add(sessionId);
  }

  clearQuestionnairePending(sessionId: string): void {
    this.pendingQuestionnaire.delete(sessionId);
  }

  hasNoticeSent(sessionId: string): boolean {
    return this.noticesSent.has(sessionId);
  }

  markNoticeSent(sessionId: string): void {
    this.noticesSent.add(sessionId);
  }

  recordArtifact(sessionId: string, artifact: IdeaCollectorArtifact): void {
    this.artifacts.set(sessionId, artifact);
  }

  getArtifact(sessionId: string): IdeaCollectorArtifact | null {
    return this.artifacts.get(sessionId) ?? null;
  }

  recordAssistantMessage(sessionId: string, content: string): void {
    this.lastAssistantMessages.set(sessionId, content);
  }

  getLastAssistantMessage(sessionId: string): string | null {
    return this.lastAssistantMessages.get(sessionId) ?? null;
  }

  setOutputPaths(
    sessionId: string,
    outputPaths: IdeaContractSnapshot["outputPaths"]
  ): void {
    this.outputPathsBySession.set(sessionId, outputPaths);
  }

  getOutputPaths(
    sessionId: string
  ): IdeaContractSnapshot["outputPaths"] | null {
    return this.outputPathsBySession.get(sessionId) ?? null;
  }

  setStage(sessionId: string, stage: WorkflowStageId): void {
    this.sessionStages.set(sessionId, stage);
  }

  getStage(sessionId: string): WorkflowStageId {
    return this.sessionStages.get(sessionId) ?? "description";
  }
}
