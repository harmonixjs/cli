import { execa, Options } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export function detectPackageManager(directory = process.cwd()): PackageManager {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent?.includes('yarn')) return 'yarn';
  if (userAgent?.includes('pnpm')) return 'pnpm';
  if (fs.existsSync(path.join(directory, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(directory, 'pnpm-lock.yaml'))) return 'pnpm';
  return 'npm';
}

export async function installDependencies(
  packageManager: PackageManager,
  cwd = process.cwd()
): Promise<void> {
  await execa(packageManager, ['install'], { cwd, stdio: 'inherit' });
}

export async function addDependencies(
  packageManager: PackageManager,
  packages: string[],
  cwd = process.cwd(),
  dev = false
): Promise<void> {
  if (!packages.length) return;

  const args = packageManager === 'npm'
    ? ['install', ...(dev ? ['--save-dev'] : []), ...packages]
    : packageManager === 'yarn'
      ? ['add', ...(dev ? ['--dev'] : []), ...packages]
      : ['add', ...(dev ? ['--save-dev'] : []), ...packages];

  await execa(packageManager, args, { cwd, stdio: 'inherit' });
}

export async function runScript(
  packageManager: PackageManager,
  script: string,
  cwd: string,
  extraArgs: string[] = [],
  options: Options = {}
): Promise<void> {
  const args = packageManager === 'npm'
    ? ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : [])]
    : ['run', script, ...extraArgs];

  await execa(packageManager, args, {
    cwd,
    stdio: 'inherit',
    preferLocal: true,
    ...options
  });
}
