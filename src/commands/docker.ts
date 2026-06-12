import fs from 'fs-extra';
import path from 'path';
import {
  HarmonixProjectConfig,
  readProjectConfig
} from '../utils/filesystem';
import { compiledEntry, requireProject } from '../utils/project';
import { success } from '../utils/logger';

export interface DockerOptions {
  compose?: boolean;
  force?: boolean;
  nodeVersion?: string;
}

export async function dockerCommand(options: DockerOptions = {}): Promise<void> {
  const { root, config } = await requireProject();
  await generateDockerFiles(root, config, options);
  success('Docker files generated.');
}

export async function generateDockerFiles(
  root: string,
  config: HarmonixProjectConfig,
  options: DockerOptions = {}
): Promise<void> {
  const dockerfile = path.join(root, 'Dockerfile');
  const dockerignore = path.join(root, '.dockerignore');
  const compose = path.join(root, 'docker-compose.yml');

  for (const file of [dockerfile, dockerignore, ...(options.compose ? [compose] : [])]) {
    if (await fs.pathExists(file) && !options.force) {
      throw new Error(`${path.basename(file)} already exists. Use --force to replace it.`);
    }
  }

  const startFile = config.plugins.some(plugin => plugin.name === 'shard')
    ? compiledEntry(config, config.shardEntry)
    : compiledEntry(config, config.entry);
  const nodeVersion = options.nodeVersion ?? '20';
  const install = installCommand(config.packageManager);
  const productionInstall = productionInstallCommand(config.packageManager);
  const lockCopy = lockFileCopy(config.packageManager);

  await fs.writeFile(dockerfile, `FROM node:${nodeVersion}-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json ./
${lockCopy}
RUN ${install}

COPY tsconfig.json harmonix.config.json ./
COPY ${config.sourceDir} ./${config.sourceDir}
RUN ${runCommand(config.packageManager, 'build')}

FROM node:${nodeVersion}-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

COPY package.json ./
${lockCopy}
RUN ${productionInstall}

COPY --from=build /app/${config.outDir} ./${config.outDir}

RUN mkdir -p /app/data && chown -R node:node /app
USER node

CMD ["node", "${startFile.replace(/\\/g, '/')}"]
`);

  await fs.writeFile(dockerignore, `node_modules
${config.outDir}
.git
.env
*.log
Dockerfile*
docker-compose*.yml
data
`);

  if (options.compose) {
    const hasExpress = config.plugins.some(plugin => plugin.name === 'express');
    await fs.writeFile(compose, `services:
  bot:
    build:
      context: .
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - harmonix-data:/app/data
${hasExpress ? '    ports:\n      - "3000:3000"\n' : ''}
volumes:
  harmonix-data:
`);
  }
}

function installCommand(packageManager: HarmonixProjectConfig['packageManager']): string {
  if (packageManager === 'npm') return 'npm ci';
  if (packageManager === 'pnpm') return 'pnpm install --frozen-lockfile';
  return 'yarn install --immutable';
}

function productionInstallCommand(
  packageManager: HarmonixProjectConfig['packageManager']
): string {
  if (packageManager === 'npm') return 'npm ci --omit=dev';
  if (packageManager === 'pnpm') return 'pnpm install --prod --frozen-lockfile';
  return 'yarn install --production --frozen-lockfile';
}

function runCommand(
  packageManager: HarmonixProjectConfig['packageManager'],
  script: string
): string {
  return packageManager === 'npm'
    ? `npm run ${script}`
    : `${packageManager} run ${script}`;
}

function lockFileCopy(packageManager: HarmonixProjectConfig['packageManager']): string {
  if (packageManager === 'npm') return 'COPY package-lock.json ./';
  if (packageManager === 'pnpm') return 'COPY pnpm-lock.yaml ./';
  return 'COPY yarn.lock ./';
}
