import { createBot } from "mineflayer";
import { promisify } from "util";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import AutoEat from "./index";

const sleep = promisify(setTimeout);

const bot = createBot({
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
    username: process.argv[4] ?? "auto_eat_testing",
    password: process.argv[5] ?? undefined,
});

// Load the plugin
bot.loadPlugin(AutoEat);

async function beginMonitor() {
    while (true) {
        await sleep(1000);
        bot.chat(`I am at ${bot.health} health and ${bot.food} food.`);
    }
}

async function flipHands() {
    while (true) {
        await sleep(10000);
        bot.autoEat.options.useOffHand = !bot.autoEat.options.useOffHand;
    }
}

bot.once("spawn", async () => {
    bot.autoEat.enable();

    bot.autoEat.setOptions({
        useOffHand: false,
        priority: "foodPoints",
        bannedFood: [],
        eatingTimeout: 3000
    })

    await bot.waitForTicks(20);

    bot.chat(`/clear ${bot.username}`);
    bot.chat(`/gamemode survival ${bot.username}`);
    bot.chat(`/give ${bot.username} minecraft:golden_apple 64`);
    if (Number(bot.version.split(".")[1]) >= 13) bot.chat(`/effect give ${bot.username} minecraft:hunger 100000 100`);
    else bot.chat(`/effect ${bot.username} minecraft:hunger 100000 100`);

    beginMonitor();
    flipHands();
});

// The bot eats food automatically and emits these events when it starts eating and stops eating.

bot.on("autoEatStarted", (item, offhand) => {
    console.log(`Auto Eat started! Eating ${item.displayName}. Using ${offhand ? "off-hand" : "hand"}`);
});

bot.on("autoEatFinished", (item, offhand) => {
    console.log(`Auto Eat finished! Finished eating ${item?.displayName}. Used ${offhand ? "off-hand" : "hand"}`);
});
