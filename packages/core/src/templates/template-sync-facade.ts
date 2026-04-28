import type { Logger } from "../telemetry/logger";
import { TemplateSyncService } from "./template-sync-service";
import {
  type PendingTemplateUpdate,
  type TemplateUpdateResolutionRequest,
  type TemplateUpdateResolutionResult,
  TemplateUpdateResolutionService,
} from "./template-update-resolution-service";

export class TemplateSyncFacade {
  private readonly service: TemplateSyncService;
  private readonly updateResolutionService: TemplateUpdateResolutionService;

  constructor(logger: Logger) {
    this.service = new TemplateSyncService(logger);
    this.updateResolutionService = new TemplateUpdateResolutionService(logger);
  }

  sync(): Promise<void> {
    return this.service.sync();
  }

  listPendingUpdates(): Promise<readonly PendingTemplateUpdate[]> {
    return this.updateResolutionService.listPendingUpdates();
  }

  resolvePendingUpdate(
    request: TemplateUpdateResolutionRequest
  ): Promise<TemplateUpdateResolutionResult> {
    return this.updateResolutionService.resolvePendingUpdate(request);
  }
}
