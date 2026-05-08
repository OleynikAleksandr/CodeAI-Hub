import type { NativeRequestCaptureFacade } from "../provider-network-capture/native-request-capture-facade";
import type { SessionManager } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import type { DialogHistoryService } from "./handlers/dialog-history-service";
import type { DialogListService } from "./handlers/dialog-list-service";
import type { DialogOpenService } from "./handlers/dialog-open-service";
import type { ProjectRequestHandler } from "./handlers/project-request-handler";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import type { SessionSpeechRequestHandler } from "./handlers/session-speech-request-handler";
import type { SettingsRequestHandler } from "./handlers/settings-request-handler";
import type { WebSocketManager } from "./handlers/websocket-manager";

export interface RemoteBridgeMessageRouterDependencies {
  readonly dialogHistoryService: DialogHistoryService;
  readonly dialogListService: DialogListService;
  readonly dialogOpenService: DialogOpenService;
  readonly getManager: () => WebSocketManager | undefined;
  readonly logger: Logger;
  readonly nativeRequestCaptureFacade: Pick<
    NativeRequestCaptureFacade,
    "capture"
  >;
  readonly projectHandler: ProjectRequestHandler;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly sessionSpeechHandler?: SessionSpeechRequestHandler;
  readonly settingsHandler: SettingsRequestHandler;
  readonly workflowRuntime: WorkflowRuntime;
  readonly workspaceRuntime: WorkspaceRuntimeFacade;
}
