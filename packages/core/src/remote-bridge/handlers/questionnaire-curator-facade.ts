import type { CoreConfig } from "../../config";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { CuratorProviderAdapter } from "./questionnaire-curator-provider-runner";
import { QuestionnaireCuratorService } from "./questionnaire-curator-service";

export class QuestionnaireCuratorFacade {
  private readonly service: QuestionnaireCuratorService;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.service = new QuestionnaireCuratorService(options);
  }

  maybeCurate(
    session: Session,
    adapter: CuratorProviderAdapter
  ): Promise<void> {
    return this.service.maybeCurate(session, adapter);
  }
}
