#!/usr/bin/env node
import { Command } from 'commander';
import gradient from 'gradient-string';
import { version } from '../package.json';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import {
  addPluginCommand,
  listPluginsCommand,
  removePluginCommand
} from './commands/plugin';
import { dockerCommand } from './commands/docker';
import { devCommand } from './commands/dev';
import { buildCommand } from './commands/build';
import { startCommand } from './commands/start';
import { doctorCommand } from './commands/doctor';
import { error } from './utils/logger';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('harmonix')
    .description('Manage HarmonixJS applications')
    .version(version)
    .showHelpAfterError()
    .showSuggestionAfterError();

  program
    .command('init [name]')
    .description('Create a new HarmonixJS project')
    .option('-t, --template <template>', 'basic or api')
    .option('-p, --package-manager <manager>', 'npm, pnpm or yarn')
    .option('--plugins <plugins>', 'comma-separated built-in plugins')
    .option('--no-install', 'do not install dependencies')
    .option('--git', 'initialize a Git repository')
    .option('--docker', 'generate a Dockerfile')
    .option('--compose', 'generate Docker Compose with --docker')
    .action((name, options) => initCommand({ ...options, name }));

  program
    .command('create [type] [name]')
    .alias('generate')
    .description('Create a command, event or component')
    .option('-s, --subtype <subtype>', 'command or component subtype')
    .option('-e, --event <event>', 'Discord event name')
    .option('-f, --force', 'replace an existing file')
    .action((type, name, options) => createCommand(type, name, options));

  program
    .command('add [plugin]')
    .description('Add and configure a HarmonixJS plugin')
    .option('--export-name <name>', 'exported class for a third-party plugin')
    .option('--plugin-name <name>', 'registry name for a third-party plugin')
    .option('--options <json>', 'plugin constructor options as JSON')
    .option('--no-install', 'update files without installing dependencies')
    .action((plugin, options) => addPluginCommand(plugin, options));

  program
    .command('remove <plugin>')
    .alias('rm')
    .description('Remove a plugin from the project configuration')
    .option('--no-install', 'do not update installed dependencies')
    .action((plugin, options) => removePluginCommand(plugin, options));

  program
    .command('plugins')
    .alias('plugin')
    .description('List configured plugins')
    .option('-a, --available', 'list the built-in plugin catalog')
    .action(listPluginsCommand);

  program
    .command('docker')
    .description('Generate production Docker files')
    .option('-c, --compose', 'also generate docker-compose.yml')
    .option('-f, --force', 'replace existing Docker files')
    .option('--node-version <version>', 'Node.js Docker image version', '20')
    .action(dockerCommand);

  program
    .command('dev')
    .description('Start the bot in development mode')
    .option('--sharded', 'run the built sharded application')
    .action(devCommand);

  program
    .command('build')
    .description('Build the TypeScript application')
    .action(buildCommand);

  program
    .command('start')
    .description('Start the production bot')
    .option('-b, --build', 'build before starting')
    .option('--sharded', 'force the sharded entrypoint')
    .action(startCommand);

  program
    .command('doctor')
    .description('Check project configuration and production readiness')
    .option('-b, --build', 'also run the TypeScript build')
    .action(doctorCommand);

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  if (process.stdout.isTTY) {
    console.log(gradient.pastel.multiline(`
 _   _                                  _
| | | | __ _ _ __ _ __ ___   ___  _ __ (_)_  __
| |_| |/ _\` | '__| '_ \` _ \\ / _ \\| '_ \\| \\ \\/ /
|  _  | (_| | |  | | | | | | (_) | | | | |>  <
|_| |_|\\__,_|_|  |_| |_| |_|\\___/|_| |_|_/_/\\_\\.JS
`));
  }

  await createProgram().parseAsync(argv);
}

export function reportCliError(reason: unknown): void {
  error(reason instanceof Error ? reason.message : String(reason));
  process.exitCode = 1;
}
