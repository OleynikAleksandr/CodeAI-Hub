import type { Logger } from "../telemetry/logger";
import { TemplateSyncService } from "./template-sync-service";

export class TemplateSyncFacade {
  private readonly service: TemplateSyncService;

  constructor(logger: Logger) {
    this.service = new TemplateSyncService(logger);
  }

  sync(): Promise<void> {
    return this.service.sync();
  }
}
