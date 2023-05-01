import { Bot } from "mineflayer";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import { EatUtil } from "./new";

declare module "mineflayer" {
    interface Bot {
        autoEat: EatUtil;
    }
}

export function loader(bot: Bot) {
    if (!bot.hasPlugin(utilPlugin)) bot.loadPlugin(utilPlugin)
    bot.autoEat = new EatUtil(bot);
}
