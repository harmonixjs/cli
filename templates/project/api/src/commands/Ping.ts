import { Harmonix, Command, CommandContext, CommandExecutor } from "@harmonixjs/core";

@Command({
    name: "ping",
    description: "Ping command",
})
export default class PingCommand implements CommandExecutor {
    execute(bot: Harmonix, ctx: CommandContext) {
        ctx.reply("Pong!");
    }
}