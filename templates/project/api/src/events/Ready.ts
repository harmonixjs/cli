import { Event, EventExecutor, Harmonix } from "@harmonixjs/core";
import { Events, Client } from "discord.js";

@Event(Events.ClientReady)
export default class ClientReady implements EventExecutor<Events.ClientReady> {
    execute(bot: Harmonix, client: Client<true>) {
        bot.logger.sendLog("SUCCESS", `Bot is ready! Logged in as ${client.user.tag}`);
    }
}