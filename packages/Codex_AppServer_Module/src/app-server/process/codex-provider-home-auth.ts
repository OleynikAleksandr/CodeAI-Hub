import {
  access,
  link,
  lstat,
  mkdir,
  readlink,
  rm,
  symlink,
} from "node:fs/promises";
import path from "node:path";

export interface CodexProviderHomeAuthMaterialization {
  readonly destinationPath: string;
  readonly linked: boolean;
  readonly sourcePath: string;
}

const resolveLinkTarget = (params: {
  readonly destinationPath: string;
  readonly linkTarget: string;
}): string =>
  path.resolve(path.dirname(params.destinationPath), params.linkTarget);

const isSharedAuthLink = async (params: {
  readonly destinationPath: string;
  readonly sourcePath: string;
}): Promise<boolean> => {
  const stats = await lstat(params.destinationPath).catch(() => null);
  if (!stats?.isSymbolicLink()) {
    return false;
  }
  const target = await readlink(params.destinationPath).catch(() => null);
  return target
    ? resolveLinkTarget({
        destinationPath: params.destinationPath,
        linkTarget: target,
      }) === path.resolve(params.sourcePath)
    : false;
};

export const materializeCodexProviderHomeAuth = async (params: {
  readonly authFilename: string;
  readonly legacyCodexHome: string;
  readonly providerCodexHome: string;
}): Promise<CodexProviderHomeAuthMaterialization | null> => {
  const sourcePath = path.join(params.legacyCodexHome, params.authFilename);
  const destinationPath = path.join(
    params.providerCodexHome,
    params.authFilename
  );

  try {
    await access(sourcePath);
  } catch {
    return null;
  }

  if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
    return { destinationPath, linked: true, sourcePath };
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  if (await isSharedAuthLink({ destinationPath, sourcePath })) {
    return { destinationPath, linked: true, sourcePath };
  }

  await rm(destinationPath, { force: true });
  const relativeSourcePath = path.relative(
    path.dirname(destinationPath),
    sourcePath
  );
  try {
    await symlink(relativeSourcePath || sourcePath, destinationPath);
  } catch {
    await link(sourcePath, destinationPath);
  }
  return { destinationPath, linked: true, sourcePath };
};
