import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import {
  defaultProjectConfig,
  HarmonixProjectConfig,
  writePackageJson,
  writeProjectConfig
} from '../utils/filesystem';
import {
  detectPackageManager,
  installDependencies,
  PackageManager
} from '../utils/package-manager';
import { success } from '../utils/logger';
import {
  findPluginDefinition,
  pluginRegistry,
  toPluginConfig
} from '../plugins/registry';
import {
  ensureShardFiles,
  generatePluginModule
} from '../plugins/generator';
import { generateDockerFiles } from './docker';

export interface InitOptions {
  name?: string;
  template?: 'basic' | 'api';
  packageManager?: PackageManager;
  plugins?: string;
  install?: boolean;
  git?: boolean;
  docker?: boolean;
  compose?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const interactive = Boolean(process.stdin.isTTY);
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-harmonix-bot',
      when: interactive && !options.name,
      validate: Boolean
    },
    {
      type: 'list',
      name: 'template',
      message: 'Project template:',
      choices: [
        { name: 'Basic bot', value: 'basic' },
        { name: 'Bot with Express API', value: 'api' }
      ],
      when: interactive && !options.template
    },
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Plugins:',
      choices: pluginRegistry.map(plugin => ({
        name: `${plugin.package} - ${plugin.description}`,
        value: plugin.id,
        checked: options.template === 'api' && plugin.id === 'express'
      })),
      when: interactive && options.plugins === undefined
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'pnpm', 'yarn', 'bun'],
      default: detectPackageManager(),
      when: interactive && !options.packageManager
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Initialize Git?',
      default: false,
      when: interactive && options.git === undefined
    }
  ]);

  const projectName = options.name ?? answers.projectName ?? 'my-harmonix-bot';
  const template = options.template ?? answers.template ?? 'basic';
  const packageManager = options.packageManager ?? answers.packageManager ?? detectPackageManager();
  const selectedPlugins = options.plugins !== undefined
    ? options.plugins.split(',').map(value => value.trim()).filter(Boolean)
    : answers.plugins ?? [];
  const initGit = options.git ?? answers.git ?? false;

  if (template === 'api' && !selectedPlugins.includes('express')) {
    selectedPlugins.push('express');
  }

  const root = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(root)) {
    throw new Error(`Directory '${projectName}' already exists.`);
  }

  await fs.ensureDir(root);

  try {
    const config = createConfig(packageManager, selectedPlugins);
    await createProjectFiles(root, projectName, config);

    if (options.docker) {
      await generateDockerFiles(root, config, { compose: options.compose });
    }

    if (options.install !== false) {
      await installDependencies(packageManager, root);
    }

    if (initGit) {
      await execa('git', ['init'], { cwd: root });
      await execa('git', ['add', '.'], { cwd: root });
      await execa('git', ['commit', '-m', 'Initialize Harmonix project'], {
        cwd: root
      });
    }

    success(`Project '${projectName}' created.`);
    console.log(`cd ${projectName}`);
    console.log('Configure BOT_TOKEN and BOT_CLIENT_ID in .env, then run harmonix dev.');
  } catch (error) {
    await fs.remove(root);
    throw error;
  }
}

function createConfig(
  packageManager: PackageManager,
  selectedPlugins: string[]
): HarmonixProjectConfig {
  const config = defaultProjectConfig(packageManager);

  for (const selected of selectedPlugins) {
    const definition = findPluginDefinition(selected);
    if (!definition) {
      throw new Error(
        `Unknown built-in plugin '${selected}'. Add third-party plugins after initialization.`
      );
    }
    config.plugins.push(toPluginConfig(definition));
  }

  if (config.plugins.some(plugin => plugin.name === 'express')) {
    config.folders.controllers = 'src/controllers';
  }

  return config;
}

async function createProjectFiles(
  root: string,
  projectName: string,
  config: HarmonixProjectConfig
): Promise<void> {
  const dependencies: Record<string, string> = {
    '@harmonixjs/core': '^2.0.0',
    'discord.js': '^14.26.4',
    'dotenv': '^16.4.0'
  };

  for (const plugin of config.plugins) {
    const definition = findPluginDefinition(plugin.package);
    if (!definition) continue;
    dependencies[definition.package] = definition.version;
    Object.assign(dependencies, definition.dependencies);
  }

  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    description: 'A Discord bot built with HarmonixJS',
    main: 'dist/index.js',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      'start:prod': 'npm run build && npm run start'
    },
    dependencies,
    devDependencies: {
      '@types/node': '^20.14.0',
      tsx: '^4.19.0',
      typescript: '^5.4.0'
    },
    engines: {
      node: '>=18.0.0'
    }
  };

  await writePackageJson(root, packageJson);
  await writeProjectConfig(root, config);
  await fs.writeJSON(path.join(root, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      moduleResolution: 'node',
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      outDir: config.outDir,
      rootDir: config.sourceDir,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true
    },
    include: [`${config.sourceDir}/**/*.ts`],
    exclude: ['node_modules', config.outDir]
  }, { spaces: 2 });

  for (const folder of Object.values(config.folders)) {
    if (folder) await fs.ensureDir(path.join(root, folder));
  }

  await fs.writeFile(path.join(root, config.entry), createIndexSource(config));
  await generatePluginModule(root, config);
  await ensureShardFiles(root, config);
  await createExamples(root, config);
  await createEnvironmentFiles(root);

  if (config.plugins.some(plugin => plugin.name === 'i18n')) {
    await fs.ensureDir(path.join(root, config.sourceDir, 'locales'));
    await fs.writeJSON(
      path.join(root, config.sourceDir, 'locales', 'en-US.json'),
      { common: {}, commands: {} },
      { spaces: 2 }
    );
  }
}

function createIndexSource(config: HarmonixProjectConfig): string {
  const relativePlugins = './' + path
    .relative(path.dirname(config.entry), path.join(config.sourceDir, 'harmonix.plugins'))
    .replace(/\\/g, '/');

  return `import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { Harmonix } from "@harmonixjs/core";
import { harmonixPlugins } from ${JSON.stringify(relativePlugins)};

const bot = new Harmonix({
  bot: {
    id: process.env.BOT_CLIENT_ID!,
    token: process.env.BOT_TOKEN!,
    prefix: "!"
  },
  publicApp: false,
  guilds: [],
  folders: {
    commands: "./${config.folders.commands}",
    events: "./${config.folders.events}",
    components: "./${config.folders.components}"
  },
  plugins: harmonixPlugins,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

bot.start();
`;
}

async function createExamples(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  await fs.writeFile(
    path.join(root, config.folders.commands, 'Ping.ts'),
    `import { Command } from "@harmonixjs/core";

const Ping = Command({
  name: "ping",
  description: "Display the bot latency"
});

@Ping
export default class PingCommand {
  execute = Ping.handler(async (_bot, ctx) => {
    await ctx.reply("Pong!");
  });
}
`
  );

  await fs.writeFile(
    path.join(root, config.folders.events, 'Ready.ts'),
    `import { Events } from "discord.js";
import { Event } from "@harmonixjs/core";

const Ready = Event(Events.ClientReady);

@Ready
export default class ReadyEvent {
  execute = Ready.handler((_bot, client) => {
    console.log(\`Logged in as \${client.user.tag}\`);
  });
}
`
  );
}

async function createEnvironmentFiles(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, '.env.example'),
    'BOT_TOKEN=\nBOT_CLIENT_ID=\n'
  );
  await fs.writeFile(
    path.join(root, '.env'),
    'BOT_TOKEN=your_bot_token\nBOT_CLIENT_ID=your_application_id\n'
  );
  await fs.writeFile(
    path.join(root, '.gitignore'),
    'node_modules/\ndist/\n.env\n*.log\ndata/\n*.sqlite\n'
  );
}
