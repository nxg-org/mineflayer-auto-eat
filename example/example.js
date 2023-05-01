const { createBot } =require( "mineflayer");
const { promisify } = require( "util");
const  {loader: autoEat} = require("../lib");

const sleep = promisify(setTimeout);

const bot = createBot({
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
    version: process.argv[4],
    username: "bruh"
});


async function beginMonitor() {
    while (true) {
        await sleep(1000);
        bot.chat(`I am at ${bot.health.toFixed(2)} health and ${bot.food} food.`);
    }
}

async function flipHands() {
    while (true) {
        await sleep(10000);
     
        bot.autoEat.opts.offhand = !bot.autoEat.opts.offhand;
    }
}

bot.once("spawn", async () => {

    console.log(autoEat)
    // Load the plugin
    bot.loadPlugin(autoEat);


    // bot.autoEat.setOptions({
    //     useOffHand: false,
    //     priority: "foodPoints",
    //     bannedFood: [],
    //     eatingTimeout: 3000
    // })

    await bot.waitForTicks(20);

    bot.chat(`/clear ${bot.username}`);
    bot.chat(`/gamemode survival ${bot.username}`);
    bot.chat(`/give ${bot.username} minecraft:cooked_porkchop 64`);
    if (Number(bot.version.split(".")[1]) >= 13) bot.chat(`/effect give ${bot.username} minecraft:hunger 100000 100`);
    else bot.chat(`/effect ${bot.username} minecraft:hunger 100000 100`);

    bot.autoEat.enableAuto();
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
