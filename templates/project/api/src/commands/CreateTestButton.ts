import { Harmonix, Command, CommandContext, CommandExecutor } from "@harmonixjs/core";
import { ActionRowBuilder, ButtonBuilder } from "discord.js";

@Command({
    name: "create_test_button",
    description: "Create a test button",
})
export default class CreateTestButton implements CommandExecutor {
    execute(bot: Harmonix, ctx: CommandContext) {
        const button = new ButtonBuilder()
            .setCustomId("test_button")
            .setLabel("Test")
            .setStyle(1);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        ctx.reply({content: 'Button Test', components: [row]});
    }
}