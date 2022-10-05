import { Bot, BotEvents } from "mineflayer";
import { Item } from "prismarine-item";
import { AutoEat } from "./autoEat";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import md from "minecraft-data";

declare module "mineflayer" {
    interface Bot {
        autoEat: AutoEat;
        registry: md.IndexedData;
    }
    interface BotEvents {
        autoEatStarted: (eatenItem: Item, usedHand: boolean) => void;
        autoEatFinished: (eatenItem: Item | null, usedHand: boolean, error?: Error | unknown | undefined) => void;
    }
}

export default function plugin(bot: Bot) {
    if (!bot.hasPlugin(utilPlugin)) bot.loadPlugin(utilPlugin)
    bot.autoEat = new AutoEat(bot);
}
