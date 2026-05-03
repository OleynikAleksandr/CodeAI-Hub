import type { Session, SessionMessage } from "../../session-manager";
import type { SessionModelBinding } from "../../session-model-binding";

const DOCUMENTATION_TREE_STAGES = new Set([
  "description",
  "virtual_simulation",
  "diagram_modules",
]);

const INTERNAL_ASSISTANT_PATTERNS = [
  /^ready to continue working\.?$/i,
  /^готов продолжать работу\.?$/i,
];

export interface DocumentationRolloverContext {
  readonly createdAtIso: string;
  readonly lastUserVisibleAssistantMessage: string | null;
  readonly modelBinding: SessionModelBinding | null;
  readonly providerId: string;
  readonly rolloverId: string;
  readonly runSlug: string | null;
  readonly sourceSessionId: string;
  readonly stageId: string;
  readonly targetSessionId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export const isDocumentationTreeRolloverStage = (
  stageId: string | null | undefined
): boolean =>
  typeof stageId === "string" && DOCUMENTATION_TREE_STAGES.has(stageId);

export class SessionRequestHandlerDocumentationRolloverState {
  private readonly contextsBySourceSessionId = new Map<
    string,
    DocumentationRolloverContext
  >();
  private readonly contextsByTargetSessionId = new Map<
    string,
    DocumentationRolloverContext
  >();

  getBySourceSessionId(sessionId: string): DocumentationRolloverContext | null {
    return this.contextsBySourceSessionId.get(sessionId) ?? null;
  }

  getByTargetSessionId(sessionId: string): DocumentationRolloverContext | null {
    return this.contextsByTargetSessionId.get(sessionId) ?? null;
  }

  registerMaterializedRollover(options: {
    readonly rolloverId: string;
    readonly sourceSession: Session;
    readonly targetSession: Session;
    readonly workspaceSlug: string;
  }): DocumentationRolloverContext {
    const context: DocumentationRolloverContext = {
      createdAtIso: new Date().toISOString(),
      lastUserVisibleAssistantMessage: this.resolveLastVisibleAssistantMessage(
        options.sourceSession
      ),
      modelBinding: options.sourceSession.modelBinding ?? null,
      providerId: options.sourceSession.providerId,
      rolloverId: options.rolloverId,
      runSlug: options.sourceSession.runSlug,
      sourceSessionId: options.sourceSession.id,
      stageId: options.sourceSession.stage ?? "session",
      targetSessionId: options.targetSession.id,
      workspacePath: options.sourceSession.workspacePath,
      workspaceSlug: options.workspaceSlug,
    };
    this.contextsBySourceSessionId.set(context.sourceSessionId, context);
    this.contextsByTargetSessionId.set(context.targetSessionId, context);
    return context;
  }

  private resolveLastVisibleAssistantMessage(session: Session): string | null {
    for (const message of [...session.messages].reverse()) {
      if (this.isUserVisibleAssistantMessage(message)) {
        return message.content.trim();
      }
    }
    return null;
  }

  private isUserVisibleAssistantMessage(message: SessionMessage): boolean {
    const content = message.content.trim();
    return (
      message.role === "assistant" &&
      message.tag !== "thinking" &&
      message.visibilityAtEmission !== "hidden" &&
      content.length > 0 &&
      !INTERNAL_ASSISTANT_PATTERNS.some((pattern) => pattern.test(content))
    );
  }
}
