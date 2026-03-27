import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { CORE_LOCK_FILE, STATE_DIR } from "./paths";

interface ManagerClaim {
  readonly manager: string;
  readonly pid: number;
  readonly timestamp: number;
}

const encodeClaim = (claim: ManagerClaim): string =>
  `manager=${claim.manager}\npid=${claim.pid}\ntimestamp=${claim.timestamp}\n`;

const parseClaim = (raw: string | undefined): ManagerClaim | null => {
  if (!raw) {
    return null;
  }
  const fields = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const [key, value] = line.split("=", 2);
    if (key && value) {
      fields.set(key.trim(), value.trim());
    }
  }
  const manager = fields.get("manager");
  const pidValue = fields.get("pid");
  const timestampValue = fields.get("timestamp");
  if (!(manager && pidValue && timestampValue)) {
    return null;
  }
  const pid = Number(pidValue);
  const timestamp = Number(timestampValue);
  if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(timestamp)) {
    return null;
  }
  return { manager, pid, timestamp };
};

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const ensureStateDirectory = (): void => {
  mkdirSync(STATE_DIR, { recursive: true });
};

export class CoreManagerLock {
  private readonly managerId: string;
  private hasLock = false;

  constructor(managerId: string) {
    this.managerId = managerId;
  }

  acquire(): { acquired: boolean; owner?: string } {
    if (this.hasLock) {
      return { acquired: true };
    }
    ensureStateDirectory();
    if (this.tryCreateLock()) {
      this.hasLock = true;
      return { acquired: true };
    }
    const existing = this.readClaim();
    if (!existing) {
      this.forceRelease();
      if (this.tryCreateLock()) {
        this.hasLock = true;
        return { acquired: true };
      }
      return { acquired: false };
    }
    if (!isProcessAlive(existing.pid)) {
      this.forceRelease();
      if (this.tryCreateLock()) {
        this.hasLock = true;
        return { acquired: true };
      }
    }
    return { acquired: false, owner: existing.manager };
  }

  release(): void {
    if (!this.hasLock) {
      return;
    }
    const claim = this.readClaim();
    if (claim && claim.manager !== this.managerId) {
      this.hasLock = false;
      return;
    }
    this.forceRelease();
    this.hasLock = false;
  }

  private tryCreateLock(): boolean {
    const claim: ManagerClaim = {
      manager: this.managerId,
      pid: process.pid,
      timestamp: Date.now(),
    };
    try {
      const descriptor = openSync(CORE_LOCK_FILE, "wx");
      writeFileSync(descriptor, encodeClaim(claim), { encoding: "utf8" });
      closeSync(descriptor);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        return false;
      }
      throw error;
    }
  }

  private readClaim(): ManagerClaim | null {
    try {
      const raw = readFileSync(CORE_LOCK_FILE, "utf8");
      return parseClaim(raw);
    } catch {
      return null;
    }
  }

  private forceRelease(): void {
    try {
      unlinkSync(CORE_LOCK_FILE);
    } catch {
      // ignore unlink errors
    }
  }
}
