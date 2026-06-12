import fs from 'fs-extra';
import path from 'path';
import { readPackageJson } from '../utils/filesystem';
import { runScript } from '../utils/package-manager';
import { requireProject } from '../utils/project';
import { success, warning } from '../utils/logger';

export interface DoctorOptions {
  build?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  const { root, config } = await requireProject();
  const issues: string[] = [];
  const packageJson = await readPackageJson(root);

  for (const file of [config.entry, 'tsconfig.json', 'package.json']) {
    if (!await fs.pathExists(path.join(root, file))) {
      issues.push(`Missing ${file}`);
    }
  }

  for (const [name, folder] of Object.entries(config.folders)) {
    if (folder && !await fs.pathExists(path.join(root, folder))) {
      issues.push(`Missing ${name} directory: ${folder}`);
    }
  }

  for (const plugin of config.plugins) {
    if (!packageJson.dependencies?.[plugin.package]) {
      issues.push(`Plugin dependency not declared: ${plugin.package}`);
    }
  }

  const envPath = path.join(root, '.env');
  if (!await fs.pathExists(envPath)) {
    issues.push('Missing .env file');
  } else {
    const env = await fs.readFile(envPath, 'utf8');
    if (/BOT_TOKEN\s*=\s*(your_|$)/m.test(env)) {
      issues.push('BOT_TOKEN is not configured');
    }
    if (/BOT_CLIENT_ID\s*=\s*(your_|$)/m.test(env)) {
      issues.push('BOT_CLIENT_ID is not configured');
    }
  }

  if (config.plugins.some(plugin => plugin.name === 'shard')) {
    if (!await fs.pathExists(path.join(root, config.shardEntry))) {
      issues.push(`Missing shard entry: ${config.shardEntry}`);
    }
    if (!packageJson.scripts?.['start:sharded']) {
      issues.push('Missing start:sharded package script');
    }
  }

  if (options.build) {
    try {
      await runScript(config.packageManager, 'build', root);
    } catch {
      issues.push('TypeScript build failed');
    }
  }

  if (issues.length) {
    for (const issue of issues) warning(issue);
    throw new Error(`Doctor found ${issues.length} issue(s).`);
  }

  success('Project checks passed.');
}
