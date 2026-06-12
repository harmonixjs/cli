import fs from 'fs-extra';
import path from 'path';
import { detectPackageManager, PackageManager } from './package-manager';

export const HARMONIX_CONFIG_FILE = 'harmonix.config.json';

export interface HarmonixPluginConfig {
  package: string;
  export: string;
  name: string;
  options?: Record<string, unknown>;
}

export interface HarmonixProjectConfig {
  version: 2;
  sourceDir: string;
  entry: string;
  shardEntry: string;
  outDir: string;
  packageManager: PackageManager;
  folders: {
    commands: string;
    events: string;
    components: string;
    controllers?: string;
  };
  plugins: HarmonixPluginConfig[];
}

export function defaultProjectConfig(
  packageManager: PackageManager = detectPackageManager()
): HarmonixProjectConfig {
  return {
    version: 2,
    sourceDir: 'src',
    entry: 'src/index.ts',
    shardEntry: 'src/shard.ts',
    outDir: 'dist',
    packageManager,
    folders: {
      commands: 'src/commands',
      events: 'src/events',
      components: 'src/components'
    },
    plugins: []
  };
}

export async function findProjectRoot(start = process.cwd()): Promise<string | null> {
  let current = path.resolve(start);

  while (true) {
    if (
      await fs.pathExists(path.join(current, HARMONIX_CONFIG_FILE)) ||
      (
        await fs.pathExists(path.join(current, 'package.json')) &&
        await fs.pathExists(path.join(current, 'src', 'index.ts'))
      )
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function readProjectConfig(
  projectRoot?: string
): Promise<{ root: string; config: HarmonixProjectConfig } | null> {
  const root = projectRoot ?? await findProjectRoot();
  if (!root) return null;

  const configPath = path.join(root, HARMONIX_CONFIG_FILE);
  if (!await fs.pathExists(configPath)) {
    return {
      root,
      config: defaultProjectConfig(detectPackageManager(root))
    };
  }

  const stored = await fs.readJSON(configPath) as Partial<HarmonixProjectConfig>;
  const defaults = defaultProjectConfig(stored.packageManager ?? detectPackageManager(root));

  return {
    root,
    config: {
      ...defaults,
      ...stored,
      version: 2,
      folders: {
        ...defaults.folders,
        ...stored.folders
      },
      plugins: stored.plugins ?? []
    }
  };
}

export async function writeProjectConfig(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  await fs.writeJSON(path.join(root, HARMONIX_CONFIG_FILE), config, { spaces: 2 });
}

export async function readPackageJson(root: string): Promise<Record<string, any>> {
  return fs.readJSON(path.join(root, 'package.json'));
}

export async function writePackageJson(
  root: string,
  packageJson: Record<string, any>
): Promise<void> {
  await fs.writeJSON(path.join(root, 'package.json'), packageJson, { spaces: 2 });
}

export function projectPath(root: string, value: string): string {
  return path.resolve(root, value);
}

/** @deprecated Use readProjectConfig. */
export async function getHarmonixConfig() {
  return (await readProjectConfig())?.config ?? null;
}
