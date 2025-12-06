import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Détecte le package manager utilisé
 */
export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.includes('yarn')) return 'yarn';
    if (userAgent.includes('pnpm')) return 'pnpm';
  }

  // Check lock files
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) return 'pnpm';

  return 'npm';
}

/**
 * Installe les dépendances
 */
export async function installDependencies(pm: PackageManager): Promise<void> {
  const commands: Record<PackageManager, string[]> = {
    npm: ['install'],
    yarn: ['install'],
    pnpm: ['install'],
  };

  await execa(pm, commands[pm], { stdio: 'inherit' });
}