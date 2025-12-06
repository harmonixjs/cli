#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from './commands/init';
import { initCreateCommand } from './commands/create';
import { version } from '../package.json';
import gradient from 'gradient-string';

// ASCII Art
const banner = gradient.pastel.multiline(`
 _   _                                  _      
| | | | __ _ _ __ _ __ ___   ___  _ __ (_)_  __
| |_| |/ _\` | '__| '_ \` _ \\ / _ \\| '_ \\| \\ \\/ /
|  _  | (_| | |  | | | | | | (_) | | | | |>  < 
|_| |_|\\__,_|_|  |_| |_| |_|\\___/|_| |_|_/_/\\_\\.JS
`);

console.log(banner);
console.log('');

program
  .name('harmonix')
  .description('CLI for Harmonix Discord framework')
  .version(version);

// harmonix init
program
  .command('init')
  .description('Initialize a new Harmonix project')
  .option('-n, --name ', 'Project name')
  .option('-t, --template ', 'Project template (basic, advanced, dashboard)')
  .action(initCommand);

// harmonix create
program
  .command('create')
  .description('Create a new component (command, event, controller, model)')
  .option('-t, --type ', 'Component subtype (button, select, modal)')
  .action(initCreateCommand);

program.parse();