import { Bot, BotEvents } from "mineflayer";
import { Item } from "prismarine-item";
import { AutoEat } from "./AutoEat";

declare module "mineflayer" {
    interface Bot {
        autoEat: AutoEat;
    }
    interface BotEvents {
        autoEatStarted: (eatenItem: Item, usedHand: boolean) => void;
        autoEatStopped: (eatenItem: Item | null, usedHand: boolean, error?: Error | unknown | undefined) => void;
    }
}

export default function plugin(bot: Bot) {
    bot.autoEat = new AutoEat(bot);
}
