import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import type { NativeRequestCaptureFailureReason } from "./native-request-capture-types";

const execFileAsync = promisify(execFile);

type OpenSslVersionRunner = (opensslPath: string) => Promise<void>;

interface NativeRequestCapturePreflightOptions {
  readonly opensslPath?: string;
  readonly runOpenSslVersion?: OpenSslVersionRunner;
}

export interface NativeRequestCapturePreflightResult {
  readonly ok: boolean;
  readonly reason: NativeRequestCaptureFailureReason | null;
}

export class NativeRequestCapturePreflight {
  readonly #opensslPath: string;
  readonly #runOpenSslVersion: OpenSslVersionRunner;

  constructor(options: NativeRequestCapturePreflightOptions = {}) {
    this.#opensslPath = options.opensslPath ?? "openssl";
    this.#runOpenSslVersion =
      options.runOpenSslVersion ?? defaultRunOpenSslVersion;
  }

  async checkOpenSsl(): Promise<NativeRequestCapturePreflightResult> {
    try {
      await this.#runOpenSslVersion(this.#opensslPath);
      return { ok: true, reason: null };
    } catch {
      return { ok: false, reason: "tls_credentials_unavailable" };
    }
  }

  async checkCertificatePath(
    certificatePath: string
  ): Promise<NativeRequestCapturePreflightResult> {
    try {
      await fs.access(certificatePath);
      return { ok: true, reason: null };
    } catch {
      return { ok: false, reason: "tls_credentials_unavailable" };
    }
  }
}

const defaultRunOpenSslVersion = async (opensslPath: string): Promise<void> => {
  await execFileAsync(opensslPath, ["version"]);
};
