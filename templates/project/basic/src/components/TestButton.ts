import { Harmonix, Component, ComponentContext, ComponentExecutor } from "@harmonixjs/core";

@Component({
    id: "test_button"
})
export default class TestButton implements ComponentExecutor {
    execute(bot: Harmonix, ctx: ComponentContext) {
        ctx.reply("Test button clicked!");
    }
}