import type { BotConfig } from '@harmonixjs/core';
import fs from 'fs-extra';
import path from 'path';

/**
 * Loads the Harmonix configuration from index.ts 
 */
export async function getHarmonixConfig(): Promise<BotConfig|null> {
    const configPath = path.join(process.cwd(), 'src', 'index.ts');

    if (!await fs.pathExists(configPath)) {
        console.error("✖ src/index.ts not found!");
        return null;
    }

    try {
        const content = await fs.readFile(configPath, "utf-8");
        const match = content.match(/new Harmonix\(\s*({[\s\S]*?})\s*\)/);

        if (!match) return null;

        const configString = match[1];

        // Évaluer le bloc de config en objet JS
        return new Function(`return ${configString}`)();
    } catch (err) {
        console.error("Impossible de lire la config du bot:", err);
        return null;
    }
}