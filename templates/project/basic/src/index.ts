import { Harmonix } from "@harmonixjs/core";
import process from "process";

const bot = new Harmonix({
  bot: {
    id: process.env.BOT_CLIENT_ID!,
    token: process.env.BOT_TOKEN!,
  },
  publicApp: false,
  guilds: [
    // 'your_guild_id_here' // For testing slash commands in specific guilds
  ],
  folders: {
    commands: "./src/commands",
    events: "./src/events",
    components: "./src/components"
  },
  intents: [3249151] // All intents
});

bot.start();