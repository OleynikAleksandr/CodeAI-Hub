import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { NativeRequestCaptureTlsCredentials } from "./native-request-capture-types";

const execFileAsync = promisify(execFile);
const CERTIFICATE_DAYS = "7";
const DEFAULT_CERT_DIR = path.join(
  os.homedir(),
  ".codeai-hub",
  "diagnostics",
  "native-request-capture",
  "certs"
);

type OpenSslRunner = (
  args: readonly string[],
  options: { readonly cwd: string }
) => Promise<void>;

interface NativeRequestCaptureCertificateStoreOptions {
  readonly opensslPath?: string;
  readonly rootDir?: string;
  readonly runOpenSsl?: OpenSslRunner;
}

export interface NativeRequestCaptureCertificateBundle {
  readonly caCertPath: string;
  readonly certificatePath: string;
  readonly credentials: NativeRequestCaptureTlsCredentials;
  readonly envHints: Readonly<Record<string, string>>;
  readonly hostCertPath: string;
  readonly hostKeyPath: string;
}

export class NativeRequestCaptureCertificateStore {
  readonly #opensslPath: string;
  readonly #rootDir: string;
  readonly #runOpenSsl: OpenSslRunner;

  constructor(options: NativeRequestCaptureCertificateStoreOptions = {}) {
    this.#opensslPath = options.opensslPath ?? "openssl";
    this.#rootDir = options.rootDir ?? DEFAULT_CERT_DIR;
    this.#runOpenSsl =
      options.runOpenSsl ??
      ((args, runOptions) => this.#defaultRunOpenSsl(args, runOptions));
  }

  get rootDir(): string {
    return this.#rootDir;
  }

  async prepareHostCredentials(
    hostname: string
  ): Promise<NativeRequestCaptureCertificateBundle> {
    await fs.mkdir(this.#rootDir, { recursive: true });
    const ca = this.#caPaths();
    await this.#ensureCertificateAuthority(ca);
    const host = this.#hostPaths(hostname);
    await this.#ensureHostCertificate(hostname, ca, host);

    const [caCert, hostCert, hostKey] = await Promise.all([
      fs.readFile(ca.certPath),
      fs.readFile(host.certPath),
      fs.readFile(host.keyPath),
    ]);

    return {
      caCertPath: ca.certPath,
      certificatePath: ca.certPath,
      credentials: {
        ca: caCert,
        cert: hostCert,
        key: hostKey,
      },
      envHints: buildCertificateEnvHints(ca.certPath),
      hostCertPath: host.certPath,
      hostKeyPath: host.keyPath,
    };
  }

  async #ensureCertificateAuthority(paths: {
    readonly certPath: string;
    readonly keyPath: string;
  }): Promise<void> {
    if (await pathsExist(paths.certPath, paths.keyPath)) {
      return;
    }
    await this.#runOpenSsl(
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        paths.keyPath,
        "-out",
        paths.certPath,
        "-days",
        CERTIFICATE_DAYS,
        "-subj",
        "/CN=CodeAI Hub Native Request Capture Local CA",
      ],
      { cwd: this.#rootDir }
    );
  }

  async #ensureHostCertificate(
    hostname: string,
    ca: { readonly certPath: string; readonly keyPath: string },
    host: {
      readonly certPath: string;
      readonly csrPath: string;
      readonly extPath: string;
      readonly keyPath: string;
    }
  ): Promise<void> {
    if (await pathsExist(host.certPath, host.keyPath)) {
      return;
    }
    await fs.writeFile(
      host.extPath,
      `subjectAltName=DNS:${hostname}\nextendedKeyUsage=serverAuth\n`,
      "utf8"
    );
    await this.#runOpenSsl(
      [
        "req",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        host.keyPath,
        "-out",
        host.csrPath,
        "-subj",
        `/CN=${hostname}`,
      ],
      { cwd: this.#rootDir }
    );
    await this.#runOpenSsl(
      [
        "x509",
        "-req",
        "-in",
        host.csrPath,
        "-CA",
        ca.certPath,
        "-CAkey",
        ca.keyPath,
        "-CAcreateserial",
        "-out",
        host.certPath,
        "-days",
        CERTIFICATE_DAYS,
        "-sha256",
        "-extfile",
        host.extPath,
      ],
      { cwd: this.#rootDir }
    );
  }

  #caPaths(): { readonly certPath: string; readonly keyPath: string } {
    return {
      certPath: path.join(this.#rootDir, "codeai-hub-native-capture-ca.pem"),
      keyPath: path.join(this.#rootDir, "codeai-hub-native-capture-ca.key.pem"),
    };
  }

  #hostPaths(hostname: string): {
    readonly certPath: string;
    readonly csrPath: string;
    readonly extPath: string;
    readonly keyPath: string;
  } {
    const slug = hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    return {
      certPath: path.join(this.#rootDir, `${slug}.cert.pem`),
      csrPath: path.join(this.#rootDir, `${slug}.csr.pem`),
      extPath: path.join(this.#rootDir, `${slug}.ext`),
      keyPath: path.join(this.#rootDir, `${slug}.key.pem`),
    };
  }

  async #defaultRunOpenSsl(
    args: readonly string[],
    options: { readonly cwd: string }
  ): Promise<void> {
    await execFileAsync(this.#opensslPath, [...args], { cwd: options.cwd });
  }
}

const buildCertificateEnvHints = (
  caCertPath: string
): Readonly<Record<string, string>> => ({
  NODE_EXTRA_CA_CERTS: caCertPath,
  REQUESTS_CA_BUNDLE: caCertPath,
  SSL_CERT_FILE: caCertPath,
});

const pathsExist = async (
  ...pathsToCheck: readonly string[]
): Promise<boolean> => {
  const results = await Promise.all(
    pathsToCheck.map(async (pathToCheck) => {
      try {
        await fs.access(pathToCheck);
        return true;
      } catch {
        return false;
      }
    })
  );
  return results.every(Boolean);
};
