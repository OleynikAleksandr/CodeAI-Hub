import type { CoreConfig } from "../config";
import type { ProviderRegistry } from "../provider-registry";
import type { ProjectRegistry } from "../services/project-registry/project-registry";
import type { SessionManager } from "../session-manager";
import { SessionSpeechService } from "../session-speech/session-speech-service";
import type { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "../unified-session/storage";
import { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import { DialogHistoryService } from "./handlers/dialog-history-service";
import { DialogListService } from "./handlers/dialog-list-service";
import { DialogOpenService } from "./handlers/dialog-open-service";
import { ProjectRequestHandler } from "./handlers/project-request-handler";
import { SessionRequestHandler } from "./handlers/session-request-handler";
import { SessionSpeechRequestHandler } from "./handlers/session-speech-request-handler";
import { SettingsRequestHandler } from "./handlers/settings-request-handler";
import { SystemRequestHandler } from "./handlers/system-request-handler";
import { WorkflowEventsService } from "./handlers/workflow-events-service";
import { WorkflowStateService } from "./handlers/workflow-state-service";
import type { BridgeEvent, CoreStatePayload } from "./types";

export interface RemoteBridgeBootstrapResult {
  readonly dialogHistoryService: DialogHistoryService;
  readonly dialogListService: DialogListService;
  readonly dialogOpenService: DialogOpenService;
  readonly projectHandler: ProjectRequestHandler;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionSpeechHandler: SessionSpeechRequestHandler;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly settingsHandler: SettingsRequestHandler;
  readonly systemHandler: SystemRequestHandler;
  readonly workflowEventsService: WorkflowEventsService;
  readonly workflowRuntime: WorkflowRuntime;
  readonly workflowStateService: WorkflowStateService;
  readonly workspaceRuntime: WorkspaceRuntimeFacade;
}

export const createRemoteBridgeBootstrap = (options: {
  readonly buildInitialState: () => CoreStatePayload;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly config: CoreConfig;
  readonly logger: Logger;
  readonly onShutdownRequested: () => void;
  readonly projectRegistry: ProjectRegistry;
  readonly providerRegistry: ProviderRegistry;
  readonly sessionManager: SessionManager;
  readonly version: string;
}): RemoteBridgeBootstrapResult => {
  const workflowEventsService = new WorkflowEventsService({
    logger: options.logger,
  });
  const sessionStorage = new UnifiedSessionStorage({
    workspaceSlug: options.config.claudeProjectSlug,
    logger: options.logger,
  });
  const workspaceRuntime = new WorkspaceRuntimeFacade({
    hydrateWorkspaceSessions: (workspaceRoot) =>
      options.sessionManager
        .getSessionsByWorkspacePath(workspaceRoot)
        .map((session) => ({
          sessionId: session.id,
          nodeId: session.stage ?? "session",
          providerId: session.providerId,
          providerSessionId: session.providerSessionId ?? null,
          bindingStatus: session.providerSessionStatus,
        })),
  });
  const projectHandler = new ProjectRequestHandler(
    options.projectRegistry,
    (event) => {
      options.broadcaster(event);
    }
  );
  const dialogListService = new DialogListService({ logger: options.logger });
  const dialogOpenService = new DialogOpenService({ logger: options.logger });
  const dialogHistoryService = new DialogHistoryService({
    logger: options.logger,
  });
  const sessionHandler = new SessionRequestHandler({
    config: options.config,
    sessionManager: options.sessionManager,
    providerRegistry: options.providerRegistry,
    sessionStorage,
    logger: options.logger,
    continuityClock: () => new Date().toISOString(),
    workspaceRuntime,
    broadcaster: (event) => {
      options.broadcaster(event as BridgeEvent);
    },
    stateBroadcaster: () =>
      options.broadcaster({
        type: "core:state",
        payload: options.buildInitialState(),
      }),
  });
  const sessionSpeechHandler = new SessionSpeechRequestHandler({
    broadcaster: (event) => {
      options.broadcaster(event as BridgeEvent);
    },
    service: new SessionSpeechService({ logger: options.logger }),
  });
  const workflowStateService = new WorkflowStateService({
    logger: options.logger,
    sessionManager: options.sessionManager,
  });
  const systemHandler = new SystemRequestHandler(
    options.config,
    options.version,
    options.logger,
    options.onShutdownRequested
  );
  const settingsHandler = new SettingsRequestHandler({
    config: options.config,
    logger: options.logger,
    broadcaster: (event) => {
      options.broadcaster(event as BridgeEvent);
    },
    providerRegistry: options.providerRegistry,
    sessionManager: options.sessionManager,
  });
  const workflowRuntime = new WorkflowRuntime({
    logger: options.logger,
    providerRegistry: options.providerRegistry,
    sessionHandler,
    onWatcherEvent: (event) => {
      workflowEventsService.record(event);
      workflowStateService.record(event);
    },
  });

  return {
    dialogHistoryService,
    dialogListService,
    dialogOpenService,
    projectHandler,
    sessionHandler,
    sessionSpeechHandler,
    sessionStorage,
    settingsHandler,
    systemHandler,
    workflowEventsService,
    workflowRuntime,
    workflowStateService,
    workspaceRuntime,
  };
};
