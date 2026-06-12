import { runScript } from '../utils/package-manager';
import { requireProject } from '../utils/project';

export async function buildCommand(): Promise<void> {
  const { root, config } = await requireProject();
  await runScript(config.packageManager, 'build', root);
}
