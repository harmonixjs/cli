# @harmonixjs/cli

CLI tool for the **Harmonix Discord framework**.  
Quickly initialize projects, generate commands, events, and components for your Discord bot.

---

## Installation

You can use `npx` to run the CLI without installing it globally:

```bash
npx @harmonixjs/cli <command>
```

Or install globally:

```bash
npm install -g @harmonixjs/cli
```

## Usage

### 1. Initialize a new project

Creates a new Harmonix bot project with the recommended structure:

```bash
npx @harmonixjs/cli init
```

This will generate:
- Project folder with `src` directorie
- Base configuration files
- Initial bot setup

---

### 2. Create a new component

Generates commands, events, or components using predefined templates:

```bash
npx @harmonixjs/cli create
```

This will generate the respective file in the appropriate folder with boilerplate code ready to use.

## Project Structure

After initializing, your project will look like this:

```pgsql
project/
├─ node_modules/
├─ src/
│  ├─ commands/
│  ├─ events/
│  ├─ components/
│  └─ index.ts
├─ .env
├─ package-lock.json
├─ package.json
└─ tsconfig.json
```

- `src/` - your TypeScript source code
- `src/index.ts` - basic index.ts file
- `.env` - default environment configuration


## Contributing

Feel free to open issues or submit pull requests.
Please follow the code style and structure used in the templates.
If you create some plugins you could open issues or submit pull requests to add your plugins/cli features.