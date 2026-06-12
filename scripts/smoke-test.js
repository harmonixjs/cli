const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmonix-cli-'));
const cli = path.resolve(__dirname, '..', 'bin', 'harmonix.js');
const project = path.join(root, 'bot');

function run(args, cwd = root) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`);
  }
}

try {
  run([
    'init',
    'bot',
    '--template',
    'basic',
    '--package-manager',
    'npm',
    '--plugins',
    'i18n,shard',
    '--no-install',
    '--docker',
    '--compose'
  ]);
  run(['create', 'command', 'Ban', '--subtype', 'slash'], project);
  run(['create', 'event', 'GuildLogger', '--event', 'guildCreate'], project);
  run(['create', 'component', 'Confirm', '--subtype', 'button'], project);
  run(['add', 'express', '--no-install'], project);

  assert.ok(fs.existsSync(path.join(project, 'harmonix.config.json')));
  assert.ok(fs.existsSync(path.join(project, 'src', 'harmonix.plugins.ts')));
  assert.ok(fs.existsSync(path.join(project, 'src', 'shard.ts')));
  assert.ok(fs.existsSync(path.join(project, 'src', 'commands', 'Ban.ts')));
  assert.ok(fs.existsSync(path.join(project, 'Dockerfile')));
  const commandSource = fs.readFileSync(
    path.join(project, 'src', 'commands', 'Ban.ts'),
    'utf8'
  );
  const eventSource = fs.readFileSync(
    path.join(project, 'src', 'events', 'GuildLogger.ts'),
    'utf8'
  );
  const componentSource = fs.readFileSync(
    path.join(project, 'src', 'components', 'Confirm.ts'),
    'utf8'
  );

  assert.match(commandSource, /const Ban = Command\(/);
  assert.match(commandSource, /@Ban/);
  assert.match(commandSource, /execute = Ban\.handler\(/);
  assert.match(eventSource, /const GuildLogger = Event\(/);
  assert.match(eventSource, /@GuildLogger/);
  assert.match(componentSource, /const Confirm = Component\(/);
  assert.match(componentSource, /@Confirm/);
  assert.doesNotMatch(
    `${commandSource}\n${eventSource}\n${componentSource}`,
    /define(Command|Event|Component)|implements \w+(Command|Event|Component)Executor/
  );
  assert.match(
    fs.readFileSync(path.join(project, 'docker-compose.yml'), 'utf8'),
    /3000:3000/
  );

  run(['remove', 'shard', '--no-install'], project);
  assert.ok(!fs.existsSync(path.join(project, 'src', 'shard.ts')));
  assert.doesNotMatch(
    fs.readFileSync(path.join(project, 'package.json'), 'utf8'),
    /start:sharded/
  );
  assert.match(
    fs.readFileSync(path.join(project, 'Dockerfile'), 'utf8'),
    /dist\/index\.js/
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('CLI smoke test passed.');
