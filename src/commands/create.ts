import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { log, success, error } from '../utils/logger';
import { getHarmonixConfig } from '../utils/filesystem';
import type { BotConfig } from '@harmonixjs/core';
import { Events } from 'discord.js';

type ComponentType = 'command' | 'event' | 'component';


export async function initCreateCommand() {
  log('🚀 Creating a new Harmonix component...\n')

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'componentType',
      message: 'Select component type:',
      choices: [
        { name: 'Command', value: 'command' },
        { name: 'Event', value: 'event' },
        { name: 'Component', value: 'component' },
      ],
    },
  ]);

  switch (answers.componentType) {
    case 'command':
      await createCommand();
      break;
    case 'event':
      await createEvent();
      log('Event creation not implemented yet.');
      break;
    case 'component':
      await createComponent();
      log('Component creation not implemented yet.');
      break;
    default:
      error('Unknown component type selected.');
      process.exit(1);
  }
}

async function createCommand() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'commandType',
      message: 'Select command type:',
      choices: [
        { name: 'Slash Command', value: 'slash' },
        { name: 'Prefix Command', value: 'prefix' },
        { name: 'Both', value: 'both' }
      ],
      default: 'slash',
    },
    {
      type: 'input',
      name: 'commandName',
      message: 'Enter command name:',
      validate: (input: string) => {
        if (!input) {
          return 'Command name cannot be empty';
        }
        return true;
      }
    }
  ]);
  await createComp('command', {
    name: answers.commandName,
    type: answers.commandType,
  });
}

async function createEvent() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'eventEvent',
      message: 'Enter discord event name:',
      validate: (input: string) => {
        if (!input) {
          return 'Discord event name cannot be empty';
        } else {
          if (!(input in Events)) {
            return 'Invalid Discord event name';
          }
          return true;
        }
      }
    },
    {
      type: 'input',
      name: 'eventName',
      message: 'Enter event name:',
      validate: (input: string) => {
        if (!input) {
          return 'Event name cannot be empty';
        }
        return true;
      }
    }
  ]);
  await createComp('event', {
    name: answers.eventName,
    event: answers.eventEvent.charAt(0).toLowerCase() + answers.eventEvent.slice(1),
  });
}

async function createComponent() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'componentType',
      message: 'Select component type:',
      choices: [
        { name: 'Button', value: 'button' },
        { name: 'String Select Menu', value: 'string-select' },
        { name: 'User Select Menu', value: 'user-select' },
        { name: 'Role Select Menu', value: 'role-select' },
        { name: 'Channel Select Menu', value: 'channel-select' },
        { name: 'Mentionable Select Menu', value: 'mentionable-select' },
        { name: 'Modal', value: 'modal' },
      ],
      default: 'button',
    },
    {
      type: 'input',
      name: 'componentId',
      message: 'Enter component id:',
      validate: (input: string) => {
        if (!input) {
          return 'Component id cannot be empty';
        }
        return true;
      }
    }
  ]);
  await createComp('component', {
    name: answers.componentId,
    type: answers.componentType,
  });
}

async function createComp(type: ComponentType, options: { [key: string]: any }) {
  const spinner = ora('Creating component...').start();
  try {
    const config = await getHarmonixConfig();
    if (!config) {
      spinner.fail('src/index.ts not found!');
      error('Run this command from a Harmonix project directory.');
      process.exit(1);
    }

    const cname = options.name;

    const destPath = getDestinationPath(type, cname, config);

    if (await fs.pathExists(destPath)) {
      spinner.fail('Component already exists!');
      error(`File ${destPath} already exists.`);
      process.exit(1);
    }

    await fs.ensureDir(path.dirname(destPath));

    const content = await generateComponentContent(type, cname, options);

    await fs.writeFile(destPath, content);

    spinner.succeed('Component created!');
    success(`\n✨ ${chalk.cyan(type)} created: ${chalk.green(destPath)}\n`);

  } catch (err: any) {
    spinner.fail('Failed to create component');
    error(err.message);
    process.exit(1);
  }
}

function getDestinationPath(type: ComponentType, name: string, config: BotConfig): string {
  const basePath = process.cwd();

  switch (type) {
    case 'command':
      return path.join(basePath, config.folders?.commands || 'commands', `${name}.ts`);
    case 'event':
      return path.join(basePath, config.folders?.events || 'events', `${name}.ts`);
    case 'component':
      return path.join(basePath, config.folders?.components || 'components', `${name}.ts`);
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

async function generateComponentContent(
  type: ComponentType,
  name: string,
  options: any
): Promise<any> {
  switch (type) {
    case 'command':
      return generateCommandTemplate(name, options.type);
    case 'event':
      return generateEventTemplate(name, options.event);
    case 'component':
      return generateComponentTemplate(name, options.type || 'button');
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

function generateCommandTemplate(name: string, commandType: 'slash' | 'prefix' | 'both'): string {
  const className = name + 'Command';

  const type = commandType === 'slash'
    ? '' 
    : `\n  type: '${commandType}' as const,`;

  const generic =
    commandType === 'slash'
      ? ''
      : commandType === 'prefix'
        ? '<"prefix">'
        : '<"both">';

  return `import { Command, CommandExecutor, CommandContext, Harmonix } from '@harmonixjs/core';

@Command({
  name: '${name}',
  description: 'Description of ${name} command',${type}
})
export default class ${className} implements CommandExecutor${generic} {
  async execute(bot: Harmonix, ctx: CommandContext${generic}) {
    await ctx.reply('Hello from ${name} command!');
  }
}
`;
}

function generateEventTemplate(name: string, eventName: string): string {
  const className = name + 'Event';

  return `import { Event, EventExecutor, Harmonix } from '@harmonixjs/core';

@Event("${eventName}")
export default class ${className} implements EventExecutor<"${eventName}"> {
  // You need to use auto-completion here to get the correct type for 'args'
}
`;
}

function generateComponentTemplate(name: string, componentType: string): string {
  const className = name + 'Component';
  const type = componentType === 'button' ? '' : `\n  type: '${componentType}' as const,`;
  const generic = componentType === 'button' ? '' : `<'${componentType}'>`;

  return `import { Component, ComponentExecutor, ComponentContext, Harmonix } from '@harmonixjs/core';

@Component({
  id: '${name}',
  ${type}
})
export default class ${className} implements ComponentExecutor${generic} {
  async execute(bot: Harmonix, ctx: ComponentContext${generic}) {
    await ctx.reply('Component ${name} clicked!');
  }
}
`;
}

// function generateControllerTemplate(name: string): string {
//   const className = toPascalCase(name) + 'Controller';

//   return `import { Controller, Get, Post, Bot, Query, Body } from '@harmonixjs/express';
// import { Harmonix } from '@harmonixjs/core';

// @Controller({ path: '/api/${name.toLowerCase()}' })
// export class ${className} {
  
//   @Get('/')
//   async getAll(@Bot() bot: Harmonix) {
//     return { message: 'Get all ${name}' };
//   }
  
//   @Get('/:id')
//   async getById(@Query('id') id: string) {
//     return { id, message: 'Get ${name} by id' };
//   }
  
//   @Post('/')
//   async create(@Body() body: any) {
//     return { message: 'Create ${name}', data: body };
//   }
// }
// `;
// }