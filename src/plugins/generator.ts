import fs from 'fs-extra';
import path from 'path';
import {
  HarmonixProjectConfig,
  projectPath,
  readPackageJson,
  writePackageJson,
  writeProjectConfig
} from '../utils/filesystem';
import { quote } from '../utils/naming';
import { compiledEntry } from '../utils/project';

export async function generatePluginModule(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  const imports = config.plugins.map((plugin, index) =>
    `import { ${plugin.export} as Plugin${index} } from ${quote(plugin.package)};`
  );
  const instances = config.plugins.map((plugin, index) => {
    const options = plugin.options && Object.keys(plugin.options).length
      ? JSON.stringify(plugin.options, null, 2)
          .split('\n')
          .map((line, lineIndex) => lineIndex === 0 ? line : `  ${line}`)
          .join('\n')
      : '';
    return `  new Plugin${index}(${options})`;
  });

  const content = `${imports.join('\n')}

export const harmonixPlugins = [
${instances.join(',\n')}
];
`;

  const output = projectPath(root, path.join(config.sourceDir, 'harmonix.plugins.ts'));
  await fs.ensureDir(path.dirname(output));
  await fs.writeFile(output, content);
}

export async function ensurePluginBootstrap(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  const entryPath = projectPath(root, config.entry);
  let content = await fs.readFile(entryPath, 'utf8');
  const importPath = './' + path
    .relative(path.dirname(config.entry), path.join(config.sourceDir, 'harmonix.plugins'))
    .replace(/\\/g, '/');

  if (!content.includes('harmonixPlugins')) {
    content = `import { harmonixPlugins } from ${quote(importPath)};\n${content}`;
  }

  if (!/\bplugins\s*:/.test(content)) {
    content = content.replace(
      /new\s+Harmonix\s*\(\s*\{/,
      match => `${match}\n  plugins: harmonixPlugins,`
    );
  } else if (!/\bplugins\s*:\s*harmonixPlugins\b/.test(content)) {
    content = content.replace(
      /\bplugins\s*:\s*\[/,
      'plugins: [...harmonixPlugins,'
    );
  }

  await fs.writeFile(entryPath, content);
}

export async function ensureShardFiles(
  root: string,
  config: HarmonixProjectConfig
): Promise<void> {
  if (!config.plugins.some(plugin => plugin.name === 'shard')) return;

  const shardPath = projectPath(root, config.shardEntry);
  const compiledShardEntry = compiledEntry(config, config.shardEntry);
  const botEntry = path
    .relative(path.dirname(compiledShardEntry), compiledEntry(config, config.entry))
    .replace(/\\/g, '/');

  const content = `import { resolve } from "path";
import { HarmonixShardingManager } from "@harmonixjs/shard";

const manager = new HarmonixShardingManager(
  resolve(__dirname, ${quote(botEntry)})
);

manager.start();
`;

  await fs.writeFile(shardPath, content);

  const packageJson = await readPackageJson(root);
  packageJson.scripts = {
    ...packageJson.scripts,
    'start:sharded': `node ${compiledShardEntry.replace(/\\/g, '/')}`
  };
  await writePackageJson(root, packageJson);
  await writeProjectConfig(root, config);
}
