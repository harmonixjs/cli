import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { detectPackageManager, installDependencies } from '../utils/package-manager';
import { log, success, error } from '../utils/logger';

interface InitOptions {
    name?: string;
    template?: 'basic' | 'api';
}

interface PackageJson {
    name: string;
    version: string;
    description?: string;
    main?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: any;
}


export async function initCommand(options: InitOptions) {
    log('🚀 Creating a new Harmonix project...\n');

    // Prompt pour les options manquantes
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: options.name || 'my-harmonix-bot',
            when: !options.name,
        },
        {
            type: 'list',
            name: 'template',
            message: 'Select a template:',
            choices: [
                { name: 'Basic - Simple bot with commands', value: 'basic' },
                { name: 'API - Bot with Express API', value: 'api' },
            ],
            when: !options.template,
        },
        {
            type: 'checkbox',
            name: 'plugins',
            message: 'Select additional plugins to include:',
            choices: [
                { name: 'Database (Quick DB)', value: 'quick-db' },
                { name: 'API (Express)', value: 'api' },
            ],
        },
        {
            type: 'list',
            name: 'packageManager',
            message: 'Package manager:',
            choices: ['npm', 'yarn', 'pnpm'],
            default: detectPackageManager(),
        },
        {
            type: 'confirm',
            name: 'initGit',
            message: 'Initialize git repository?',
            default: false,
        },
    ]);

    const projectName = options.name || answers.projectName;
    const template = options.template || answers.template;
    const packageManager = answers.packageManager;
    const initGit = answers.initGit;

    const projectPath = path.join(process.cwd(), projectName);

    // Vérifier si le dossier existe
    if (await fs.pathExists(projectPath)) {
        error(`Directory ${projectName} already exists!`);
        process.exit(1);
    }

    const spinner = ora('Creating project structure...').start();

    try {
        // Créer le dossier du projet
        await fs.ensureDir(projectPath);

        // Copier le template
        const templatePath = path.join(__dirname, '../../templates/project', template);
        await fs.copy(templatePath, projectPath);

        // Créer package.json
        const packageJson: PackageJson = {
            name: projectName,
            version: '1.0.0',
            description: 'A Discord bot built with Harmonix',
            main: 'dist/index.js',
            scripts: {
                dev: 'tsx watch src/index.ts',
                build: 'tsc',
                start: 'node dist/index.js',
                'start:prod': 'npm run build && npm run start',
            },
            dependencies: {
                '@harmonixjs/core': '^1.0.0',
                'discord.js': '^14.15.0',
                'dotenv': '^16.4.0',
            },
            devDependencies: {
                typescript: '^5.4.0',
                '@types/node': '^20.0.0',
                tsx: '^4.7.0',
            },
        };

        const imports = new Set<string>([
            `import { Harmonix } from "@harmonixjs/core";`,
            `import process from "process";`
        ]);

        const plugins = new Set<string>();

        if (template === 'api') {
            packageJson.dependencies!['@harmonixjs/express'] = '^1.0.0';
            packageJson.dependencies!['express'] = '^4.18.2';
            imports.add(`import { ExpressPlugin } from "@harmonixjs/express";`);
            plugins.add(`bot.use(new ExpressPlugin({ port: 3000, controllersPath: "./src/controllers" }))`);
        }

        if (answers.plugins) {
            if (answers.plugins.includes('quick-db')) {
                packageJson.dependencies!['@harmonixjs/quick-db'] = '^1.0.0';
                packageJson.dependencies!['quick.db'] = '^9.1.7';
                packageJson.dependencies!['better-sqlite3'] = '^12.5.0';
                imports.add(`import { DatabasePlugin } from "@harmonixjs/quick-db";`);
                plugins.add(`bot.use(new DatabasePlugin({ filePath: './data/database.sqlite' }))`);
            }
            if (answers.plugins.includes('api')) {
                packageJson.dependencies!['@harmonixjs/express'] = '^1.0.0';
                packageJson.dependencies!['express'] = '^4.18.2';
                imports.add(`import { ExpressPlugin } from "@harmonixjs/express";`);
                plugins.add(`bot.use(new ExpressPlugin({ port: 3000, controllersPath: "./src/controllers" }))`);
            }
        }

        const indexTs = `${Array.from(imports).join("\n")}

const bot = new Harmonix({
  bot: {
    id: process.env.BOT_CLIENT_ID!,
    token: process.env.BOT_TOKEN!,
  },
  publicApp: false,
  guilds: [
    // 'your_guild_id_here'
  ],
  folders: {
    commands: "./src/commands",
    events: "./src/events",
    components: "./src/components"
  },
  intents: [3249151],
});

${Array.from(plugins).join("\n")}

bot.start();
`;

        await fs.writeFile(path.join(projectPath, 'src/index.ts'), indexTs);
        await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

        // Créer .env
        const envContent = `# Discord Bot Token
BOT_TOKEN=your_bot_token_here
BOT_CLIENT_ID=your_client_id_here

# Database Path
DATABASE_PATH=./data/bot.sqlite
`;
        await fs.writeFile(path.join(projectPath, '.env'), envContent);

        // Créer .gitignore
        const gitignoreContent = `node_modules/
dist/
.env
*.log
data/
*.db
*.sqlite
`;
        await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);

        spinner.succeed('Project structure created!');

        // Installer les dépendances
        spinner.start('Installing dependencies...');
        process.chdir(projectPath);
        await installDependencies(packageManager);
        spinner.succeed('Dependencies installed!');

        // Initialiser git
        if (initGit) {
            spinner.start('Initializing git repository...');
            await execa('git', ['init']);
            await execa('git', ['add', '.']);
            await execa('git', ['commit', '-m', 'Initial commit']);
            spinner.succeed('Git repository initialized!');
        }

        // Success message
        success(`\n✨ Project ${chalk.cyan(projectName)} created successfully!\n`);
        log('📝 Next steps:\n');
        log(`  cd ${projectName}`);
        log(`  Edit .env and add your Discord bot token`);
        log(`  ${packageManager} run dev\n`);

    } catch (err: any) {
        spinner.fail('Failed to create project');
        error(err.message);
        process.exit(1);
    }
}