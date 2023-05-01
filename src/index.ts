import { Bot, BotEvents } from "mineflayer";
import { Item } from "prismarine-item";
import { AutoEat } from "./autoEat";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import md from "minecraft-data";
import { EatUtil } from "./new";

declare module "mineflayer" {
    interface Bot {
        autoEat: EatUtil;
        // registry: md.IndexedData;
    }
    interface BotEvents {
        autoEatStarted: (eatenItem: Item, usedHand: boolean) => void;
        autoEatFinished: (eatenItem: Item | null, usedHand: boolean, error?: Error | unknown | undefined) => void;
    }
}

export function loader(bot: Bot) {
    if (!bot.hasPlugin(utilPlugin)) bot.loadPlugin(utilPlugin)
    bot.autoEat = new EatUtil(bot);
}
