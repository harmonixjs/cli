import { runScript } from '../utils/package-manager';
import { requireProject } from '../utils/project';

export interface DevOptions {
  sharded?: boolean;
}

export async function devCommand(options: DevOptions = {}): Promise<void> {
  const { root, config } = await requireProject();

  if (options.sharded) {
    if (!config.plugins.some(plugin => plugin.name === 'shard')) {
      throw new Error('The shard plugin is not configured.');
    }
    await runScript(config.packageManager, 'build', root);
    await runScript(config.packageManager, 'start:sharded', root);
    return;
  }

  await runScript(config.packageManager, 'dev', root);
}
