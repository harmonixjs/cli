# @harmonixjs/cli

Project and production tooling for HarmonixJS v2.

## Installation

```bash
npm install --global @harmonixjs/cli
```

The CLI also works through `npx`:

```bash
npx @harmonixjs/cli init my-bot
```

## Create a project

Interactive:

```bash
harmonix init
```

Non-interactive:

```bash
harmonix init my-bot \
  --template basic \
  --package-manager npm \
  --plugins quick-db,i18n,shard \
  --docker \
  --compose
```

Generated projects contain a `harmonix.config.json`. This file is used only by
the CLI; the runtime bot configuration remains in `src/index.ts`.

## Generate application artifacts

```bash
harmonix create command ban --subtype slash
harmonix create command "View profile" --subtype user
harmonix create event GuildLogger --event guildCreate
harmonix create component ConfirmDelete --subtype button
```

Running `harmonix create` without arguments opens the interactive generator.

Supported command types:

- `slash`
- `prefix`
- `both`
- `user`
- `message`

Supported components:

- `button`
- `string-select`
- `user-select`
- `role-select`
- `channel-select`
- `mentionable-select`
- `modal`

## Manage plugins

```bash
harmonix add quick-db
harmonix add express
harmonix add i18n
harmonix add shard
harmonix plugins
harmonix plugins --available
harmonix remove i18n
```

Official aliases and package names are both accepted:

```bash
harmonix add @harmonixjs/i18n
```

Constructor options can be overridden during installation:

```bash
harmonix add express --options '{"port":4000,"controllersPath":"./src/http"}'
```

Third-party plugins can be added when their exported class and registry name
are known:

```bash
harmonix add @scope/harmonix-plugin \
  --export-name CustomPlugin \
  --plugin-name custom
```

The CLI maintains `src/harmonix.plugins.ts`, dependencies, plugin assets and
the shard launcher. It can also adopt older projects that do not yet contain a
`harmonix.config.json`.

## Development and production

```bash
harmonix dev
harmonix build
harmonix start --build
harmonix doctor --build
```

When `@harmonixjs/shard` is configured, `harmonix start` automatically uses
the sharded entrypoint. Use `harmonix dev --sharded` to build and launch the
shard manager during development.

## Docker

```bash
harmonix docker
harmonix docker --compose
```

Generated files:

- multi-stage `Dockerfile`
- `.dockerignore`
- optional `docker-compose.yml`
- persistent `/app/data` volume
- port `3000` when the Express plugin is configured
- automatic sharded or non-sharded startup

The Docker image runs as the non-root `node` user and installs production
dependencies from the selected package manager's lockfile.

## Commands

```text
harmonix init [name]
harmonix create [type] [name]
harmonix add [plugin]
harmonix remove <plugin>
harmonix plugins
harmonix docker
harmonix dev
harmonix build
harmonix start
harmonix doctor
```
