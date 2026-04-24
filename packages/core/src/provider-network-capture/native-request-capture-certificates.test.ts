import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRequestCaptureCertificateStore } from "./native-request-capture-certificates";
import { NativeRequestCapturePreflight } from "./native-request-capture-preflight";

const ANTHROPIC_CERT_PATH_PATTERN = /api\.anthropic\.com\.cert\.pem$/;

const writeOpenSslOutputs = async (args: readonly string[]): Promise<void> => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === "-keyout" || arg === "-out") && args[index + 1]) {
      await fs.writeFile(args[index + 1], `fake ${arg}`, "utf8");
    }
  }
};

test("NativeRequestCaptureCertificateStore prepares host certificate paths and env hints", async () => {
  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-certs-")
  );
  const calls: string[][] = [];
  const store = new NativeRequestCaptureCertificateStore({
    rootDir,
    runOpenSsl: async (args) => {
      calls.push([...args]);
      await writeOpenSslOutputs(args);
    },
  });

  const bundle = await store.prepareHostCredentials("api.anthropic.com");

  assert.equal(bundle.certificatePath, bundle.caCertPath);
  assert.equal(bundle.envHints.NODE_EXTRA_CA_CERTS, bundle.caCertPath);
  assert.equal(bundle.envHints.SSL_CERT_FILE, bundle.caCertPath);
  assert.match(bundle.hostCertPath, ANTHROPIC_CERT_PATH_PATTERN);
  assert.equal(calls.length, 3);
});

test("NativeRequestCapturePreflight reports unavailable OpenSSL", async () => {
  const preflight = new NativeRequestCapturePreflight({
    runOpenSslVersion: () => Promise.reject(new Error("openssl missing")),
  });

  const result = await preflight.checkOpenSsl();

  assert.equal(result.ok, false);
  assert.equal(result.reason, "tls_credentials_unavailable");
});
