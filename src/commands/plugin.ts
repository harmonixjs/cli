import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import {
  HarmonixPluginConfig,
  HarmonixProjectConfig,
  readPackageJson,
  writePackageJson,
  writeProjectConfig
} from '../utils/filesystem';
import {
  addDependencies,
  installDependencies
} from '../utils/package-manager';
import { requireProject } from '../utils/project';
import { success, warning } from '../utils/logger';
import {
  findPluginDefinition,
  isConfigurablePluginDefinition,
  pluginRegistry,
  toPluginConfig
} from '../plugins/registry';
import {
  ensurePluginBootstrap,
  ensureShardFiles,
  generatePluginModule
} from '../plugins/generator';
import { generateDockerFiles } from './docker';

export interface AddPluginOptions {
  exportName?: string;
  pluginName?: string;
  options?: string;
  install?: boolean;
}

export async function addPluginCommand(
  requested?: string,
  options: AddPluginOptions = {}
): Promise<void> {
  const { root, config } = await requireProject();
  if (!requested && !process.stdin.isTTY) {
    throw new Error('Plugin name is required in non-interactive mode.');
  }

  const selected = requested ?? (await inquirer.prompt([{
    type: 'list',
    name: 'plugin',
    message: 'Plugin to add:',
    choices: pluginRegistry.map(plugin => ({
      name: `${plugin.package} - ${plugin.description}`,
      value: plugin.id
    }))
  }])).plugin;

  const definition = findPluginDefinition(selected);
  let plugin: HarmonixPluginConfig;
  const dependencies: Record<string, string> = {};

  if (definition) {
    dependencies[definition.package] = definition.version;
    Object.assign(dependencies, definition.dependencies);

    if (!isConfigurablePluginDefinition(definition)) {
      if (options.options) {
        throw new Error(`${definition.package} does not accept plugin constructor options.`);
      }

      const packageJson = await readPackageJson(root);
      if (packageJson.dependencies?.[definition.package]) {
        warning(`${definition.package} is already installed.`);
        return;
      }

      packageJson.dependencies = {
        ...packageJson.dependencies,
        ...dependencies
      };
      await writePackageJson(root, packageJson);

      if (options.install !== false) {
        await addDependencies(
          config.packageManager,
          Object.entries(dependencies).map(([name, version]) => `${name}@${version}`),
          root
        );
      }

      success(`Package ${definition.package} added.`);
      return;
    }

    plugin = toPluginConfig(definition);
  } else {
    if (
      !process.stdin.isTTY &&
      (!options.exportName || !options.pluginName)
    ) {
      throw new Error(
        '--export-name and --plugin-name are required for third-party plugins in non-interactive mode.'
      );
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'exportName',
        message: 'Exported plugin class:',
        when: !options.exportName,
        validate: Boolean
      },
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin registry name:',
        when: !options.pluginName,
        validate: Boolean
      }
    ]);

    plugin = {
      package: selected,
      export: options.exportName ?? answers.exportName,
      name: options.pluginName ?? answers.pluginName
    };
    dependencies[selected] = 'latest';
  }

  if (options.options) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(options.options);
    } catch {
      throw new Error('--options must be valid JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('--options must contain a JSON object.');
    }
    plugin.options = {
      ...plugin.options,
      ...(parsed as Record<string, unknown>)
    };
  }

  if (config.plugins.some(current =>
    current.package === plugin.package || current.name === plugin.name
  )) {
    warning(`${plugin.package} is already configured.`);
    return;
  }

  config.plugins.push(plugin);
  await writeProjectConfig(root, config);
  await ensurePluginBootstrap(root, config);
  await generatePluginModule(root, config);
  await ensurePluginAssets(root, plugin.name, config);
  await ensureShardFiles(root, config);
  await refreshDockerFiles(root, config);

  const packageJson = await readPackageJson(root);
  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...dependencies
  };
  await writePackageJson(root, packageJson);

  if (options.install !== false) {
    await addDependencies(
      config.packageManager,
      Object.entries(dependencies).map(([name, version]) => `${name}@${version}`),
      root
    );
  }

  success(`Plugin ${plugin.package} added.`);
}

export async function removePluginCommand(
  value: string,
  options: { install?: boolean } = {}
): Promise<void> {
  const { root, config } = await requireProject();
  const plugin = config.plugins.find(current =>
    current.name === value || current.package === value
  );

  if (!plugin) throw new Error(`Plugin '${value}' is not configured.`);

  config.plugins = config.plugins.filter(current => current !== plugin);
  await writeProjectConfig(root, config);
  await generatePluginModule(root, config);

  const packageJson = await readPackageJson(root);
  delete packageJson.dependencies?.[plugin.package];
  const definition = findPluginDefinition(plugin.package);
  for (const dependency of Object.keys(definition?.dependencies ?? {})) {
    delete packageJson.dependencies?.[dependency];
  }
  if (plugin.name === 'shard') {
    delete packageJson.scripts?.['start:sharded'];
    await fs.remove(path.join(root, config.shardEntry));
  }
  await writePackageJson(root, packageJson);
  await refreshDockerFiles(root, config);

  if (options.install !== false) {
    await installDependencies(config.packageManager, root);
  }

  success(`Plugin ${plugin.package} removed from the project configuration.`);
}

async function refreshDockerFiles(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  if (!await fs.pathExists(path.join(root, 'Dockerfile'))) return;

  await generateDockerFiles(root, config, {
    force: true,
    compose: await fs.pathExists(path.join(root, 'docker-compose.yml'))
  });
}

export async function listPluginsCommand(
  options: { available?: boolean } = {}
): Promise<void> {
  if (options.available) {
    for (const plugin of pluginRegistry) {
      console.log(`${plugin.id.padEnd(12)} ${plugin.package}@${plugin.version} - ${plugin.description}`);
    }
    return;
  }

  const { config } = await requireProject();
  if (!config.plugins.length) {
    console.log('No plugins configured.');
    return;
  }

  for (const plugin of config.plugins) {
    console.log(`${plugin.name.padEnd(12)} ${plugin.package} (${plugin.export})`);
  }
}

async function ensurePluginAssets(
  root: string,
  pluginName: string,
  config: HarmonixProjectConfig
): Promise<void> {
  if (pluginName === 'i18n') {
    const locales = path.join(root, config.sourceDir, 'locales');
    await fs.ensureDir(locales);
    const locale = path.join(locales, 'en-US.json');
    if (!await fs.pathExists(locale)) {
      await fs.writeJSON(locale, { common: {}, commands: {} }, { spaces: 2 });
    }
  }

  if (pluginName === 'express') {
    const controllers = config.folders.controllers ?? 'src/controllers';
    config.folders.controllers = controllers;
    await fs.ensureDir(path.join(root, controllers));
    await writeProjectConfig(root, config);
  }
}
