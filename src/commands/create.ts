import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { Events } from 'discord.js';
import { requireProject } from '../utils/project';
import { success } from '../utils/logger';
import { quote, toCommandName, toFileName, toPascalCase } from '../utils/naming';

export type ArtifactType = 'command' | 'event' | 'component';

export interface CreateOptions {
  subtype?: string;
  event?: string;
  force?: boolean;
}

export async function createCommand(
  requestedType?: ArtifactType,
  requestedName?: string,
  options: CreateOptions = {}
): Promise<void> {
  const interactive = Boolean(process.stdin.isTTY);
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'artifactType',
      message: 'Artifact type:',
      choices: ['command', 'event', 'component'],
      when: interactive && !requestedType
    },
    {
      type: 'input',
      name: 'name',
      message: 'Name:',
      when: interactive && !requestedName,
      validate: Boolean
    }
  ]);

  const artifactType = requestedType ?? answers.artifactType;
  const name = requestedName ?? answers.name;

  if (!artifactType || !name) {
    throw new Error('Artifact type and name are required in non-interactive mode.');
  }

  if (!['command', 'event', 'component'].includes(artifactType)) {
    throw new Error(`Unknown artifact type '${artifactType}'.`);
  }

  const { root, config } = await requireProject();
  let subtype = options.subtype;
  let eventName = options.event;

  if (artifactType === 'command' && !subtype && interactive) {
    subtype = (await inquirer.prompt([{
      type: 'list',
      name: 'subtype',
      message: 'Command type:',
      choices: ['slash', 'prefix', 'both', 'user', 'message']
    }])).subtype;
  }

  if (artifactType === 'component' && !subtype && interactive) {
    subtype = (await inquirer.prompt([{
      type: 'list',
      name: 'subtype',
      message: 'Component type:',
      choices: [
        'button',
        'string-select',
        'user-select',
        'role-select',
        'channel-select',
        'mentionable-select',
        'modal'
      ]
    }])).subtype;
  }

  if (artifactType === 'event' && !eventName && interactive) {
    eventName = (await inquirer.prompt([{
      type: 'list',
      name: 'event',
      message: 'Discord event:',
      pageSize: 15,
      choices: Object.entries(Events).map(([key, value]) => ({
        name: `${key} (${value})`,
        value
      }))
    }])).event;
  }

  if (artifactType === 'event' && !eventName) {
    throw new Error('--event is required for event generation in non-interactive mode.');
  }

  const folder = config.folders[
    artifactType === 'command'
      ? 'commands'
      : artifactType === 'event'
        ? 'events'
        : 'components'
  ];
  const output = path.join(root, folder, `${toFileName(name)}.ts`);

  if (await fs.pathExists(output) && !options.force) {
    throw new Error(`File '${output}' already exists. Use --force to replace it.`);
  }

  const source = artifactType === 'command'
    ? commandTemplate(name, subtype ?? 'slash')
    : artifactType === 'event'
      ? eventTemplate(name, eventName!)
      : componentTemplate(name, subtype ?? 'button');

  await fs.ensureDir(path.dirname(output));
  await fs.writeFile(output, source);
  success(`Created ${path.relative(root, output)}.`);
}

/** Backward-compatible interactive entrypoint. */
export async function initCreateCommand(options: CreateOptions = {}): Promise<void> {
  return createCommand(undefined, undefined, options);
}

function commandTemplate(name: string, subtype: string): string {
  const className = `${toPascalCase(name)}Command`;
  const definitionName = toPascalCase(name);
  const commandName = subtype === 'user' || subtype === 'message'
    ? name
    : toCommandName(name);
  const applicationType = subtype === 'user'
    ? 'ApplicationCommandType.User'
    : subtype === 'message'
      ? 'ApplicationCommandType.Message'
      : null;

  return `import { Command } from "@harmonixjs/core";${applicationType ? '\nimport { ApplicationCommandType } from "discord.js";' : ''}

const ${definitionName} = Command({
  name: ${quote(commandName)},
  description: ${quote(`Description of ${commandName}`)}${subtype !== 'slash' ? `,\n  type: ${quote(subtype)}` : ''}${applicationType ? `,\n  applicationType: ${applicationType}` : ''}
});

@${definitionName}
export default class ${className} {
  execute = ${definitionName}.handler(async (_bot, ctx) => {
    await ctx.reply(${quote(`Command ${commandName} executed.`)});
  });
}
`;
}

function eventTemplate(name: string, eventName: string): string {
  const eventEntry = Object.entries(Events).find(([, value]) => value === eventName);
  if (!eventEntry) throw new Error(`Unknown Discord event '${eventName}'.`);
  const eventKey = eventEntry[0];
  const definitionName = toPascalCase(name);

  return `import { Events } from "discord.js";
import { Event } from "@harmonixjs/core";

const ${definitionName} = Event(Events.${eventKey});

@${definitionName}
export default class ${toPascalCase(name)}Event {
  execute = ${definitionName}.handler(async (_bot, ...args) => {
    void args;
  });
}
`;
}

function componentTemplate(name: string, subtype: string): string {
  const definitionName = toPascalCase(name);
  return `import { Component } from "@harmonixjs/core";

const ${definitionName} = Component({
  id: ${quote(name)}${subtype !== 'button' ? `,\n  type: ${quote(subtype)}` : ''}
});

@${definitionName}
export default class ${toPascalCase(name)}Component {
  execute = ${definitionName}.handler(async (_bot, ctx) => {
    await ctx.reply(${quote(`Component ${name} executed.`)});
  });
}
`;
}
