import type { Request, Response } from "express";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";

export interface TtlState {
  readonly idleSince: string | null;
  readonly idleTtlMs: number | null;
  readonly lastActivityAt: string | null;
  readonly secondsUntilShutdown: number | null;
}

export interface StatusInfo {
  readonly clientCount: number;
  readonly providerData: unknown;
  readonly sessionData: unknown;
  readonly ttlState?: TtlState;
}

const MILLISECONDS_IN_SECOND = 1000;

export class SystemRequestHandler {
  private readonly config: CoreConfig;
  private readonly version: string;
  private readonly logger: Logger;
  private readonly shutdownHook: () => void;

  constructor(
    config: CoreConfig,
    version: string,
    logger: Logger,
    shutdownHook: () => void
  ) {
    this.config = config;
    this.version = version;
    this.logger = logger;
    this.shutdownHook = shutdownHook;
  }

  handleHealth(_req: Request, res: Response, clientCount: number): void {
    res.json({
      status: "ok",
      version: this.version,
      uptime: process.uptime(),
      clients: clientCount,
      managedMode: this.config.managedMode,
      pid: process.pid,
    });
  }

  handleStatus(_req: Request, res: Response, info: StatusInfo): void {
    res.json({
      core: {
        version: this.version,
        uptime: process.uptime(),
        host: this.config.host,
        port: this.config.port,
        clients: info.clientCount,
        managedMode: this.config.managedMode,
        pid: process.pid,
        ttl:
          info.ttlState == null
            ? undefined
            : {
                mode: info.ttlState.idleTtlMs === null ? "infinite" : "finite",
                idleTtlSeconds:
                  info.ttlState.idleTtlMs === null
                    ? null
                    : Math.round(
                        info.ttlState.idleTtlMs / MILLISECONDS_IN_SECOND
                      ),
                lastActivityAt: info.ttlState.lastActivityAt,
                idleSince: info.ttlState.idleSince,
                secondsUntilShutdown: info.ttlState.secondsUntilShutdown,
              },
      },
      sessions: info.sessionData,
      providers: info.providerData,
    });
  }

  handleShutdown(_req: Request, res: Response): void {
    this.logger.info("Shutdown request received via API");
    res.json({ status: "shutting-down", pid: process.pid });
    setImmediate(() => {
      this.shutdownHook();
    });
  }
}
