import fs from 'fs-extra';
import path from 'path';
import {
  HarmonixProjectConfig,
  readProjectConfig
} from './filesystem';

export async function requireProject(): Promise<{
  root: string;
  config: HarmonixProjectConfig;
}> {
  const project = await readProjectConfig();
  if (!project) {
    throw new Error(
      'No Harmonix project found. Run this command inside a project or create one with harmonix init.'
    );
  }
  return project;
}

export async function hasScript(root: string, script: string): Promise<boolean> {
  const packageJson = await fs.readJSON(path.join(root, 'package.json'));
  return typeof packageJson.scripts?.[script] === 'string';
}

export function compiledEntry(config: HarmonixProjectConfig, sourceEntry: string): string {
  const relative = path.relative(config.sourceDir, sourceEntry);
  return path.join(config.outDir, relative).replace(/\.ts$/, '.js');
}
