import { HarmonixPluginConfig } from '../utils/filesystem';

export interface PluginDefinition {
  id: string;
  package: string;
  version: string;
  export: string;
  name: string;
  description: string;
  dependencies?: Record<string, string>;
  defaultOptions?: Record<string, unknown>;
}

export const pluginRegistry: PluginDefinition[] = [
  {
    id: 'quick-db',
    package: '@harmonixjs/quick-db',
    version: '^1.1.0',
    export: 'DatabasePlugin',
    name: 'database',
    description: 'Quick DB persistence',
    dependencies: {
      'quick.db': '^9.1.7',
      'better-sqlite3': '^12.5.0'
    },
    defaultOptions: {
      filePath: './data/database.sqlite'
    }
  },
  {
    id: 'express',
    package: '@harmonixjs/express',
    version: '^1.1.0',
    export: 'ExpressPlugin',
    name: 'express',
    description: 'Express HTTP API',
    dependencies: {
      express: '^4.22.1'
    },
    defaultOptions: {
      port: 3000,
      controllersPath: './src/controllers'
    }
  },
  {
    id: 'i18n',
    package: '@harmonixjs/i18n',
    version: '^1.0.0',
    export: 'I18nPlugin',
    name: 'i18n',
    description: 'Runtime and Discord command localization',
    defaultOptions: {
      defaultLocale: 'en-US',
      directory: './src/locales'
    }
  },
  {
    id: 'shard',
    package: '@harmonixjs/shard',
    version: '^1.0.0',
    export: 'ShardPlugin',
    name: 'shard',
    description: 'Automatic Discord sharding'
  }
];

export function findPluginDefinition(value: string): PluginDefinition | undefined {
  return pluginRegistry.find(plugin =>
    plugin.id === value || plugin.package === value || plugin.name === value
  );
}

export function toPluginConfig(definition: PluginDefinition): HarmonixPluginConfig {
  return {
    package: definition.package,
    export: definition.export,
    name: definition.name,
    options: definition.defaultOptions
  };
}
