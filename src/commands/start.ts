import { runScript } from '../utils/package-manager';
import { requireProject } from '../utils/project';

export interface StartOptions {
  build?: boolean;
  sharded?: boolean;
}

export async function startCommand(options: StartOptions = {}): Promise<void> {
  const { root, config } = await requireProject();
  const hasSharding = config.plugins.some(plugin => plugin.name === 'shard');
  const sharded = Boolean(options.sharded || hasSharding);

  if (options.build) {
    await runScript(config.packageManager, 'build', root);
  }

  await runScript(
    config.packageManager,
    sharded ? 'start:sharded' : 'start',
    root
  );
}
