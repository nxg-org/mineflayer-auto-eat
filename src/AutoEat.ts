import { Bot, EquipmentDestination } from "mineflayer";
import { performance } from "perf_hooks";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import { promisify } from "util";
import md from "minecraft-data";
const sleep = promisify(setTimeout);

export class AutoEat {
    public enabled: boolean = true;
    public isEating: boolean = true;
    public priority: "foodPoints" = "foodPoints";
    public minHunger: number = 14;
    public minHealth: number = 14;
    public bannedFood: string[] = [];
    public ignoreInventoryCheck: boolean = false;
    public returnToLastItem: boolean = false;
    public eatUntilFull: boolean = false;
    public useOffHand: boolean = false;
    public checkOnItemPickup: boolean = true;
    public eatingTimeout: number = 3000;
    private foods: { [id: number]: md.Food };
    private foodsByName: { [name: string]: md.Food };
    private lastItem?: { item: Item; dest: "hand" | "off-hand" };
    private canceled: boolean = false;

    constructor(private bot: Bot) {
        this.foodsByName = md(this.bot.version).foodsByName;
        this.foods = md(this.bot.version).foods;
        this.bot.on("physicsTick", this.healthCheck.bind(this));
        this.bot.on("spawn", () => {
            this.isEating = false;
        });
        this.bot.on("death", () => {
            this.isEating = false;
        });
        this.bot.on("playerCollect", this.playerCollectCheck.bind(this));
        this.bot._client.on("entity_status", (packet: any) => {
            if (packet.entityId === this.bot.entity.id && packet.entityStatus === 9 && this.isEating) {
                this.isEating = false;
            }
        });
    }

    async cancelEat() {
        this.isEating = false;
        this.canceled = true;
    }

    async resumeEat() {
        if (this.canceled) {
            this.isEating = false;
            this.canceled = false;
        }
    }

    async waitForEating(bestFood: Item, offhand?: boolean): Promise<boolean> {
        const time = performance.now();
        // let debug = 0;
        while (
            this.isEating &&
            performance.now() - time < this.eatingTimeout &&
            this.bot.util.inv.getHandWithItem(offhand)?.name === bestFood.name
        ) {
            // debug++
            // if (!(debug % 50)) {
            //     console.log(this.isEating, performance.now() - time, this.getHandWithItem(hand)?.name, bestFood.name)
            // }
            await sleep(0);
        }

        return performance.now() - time < this.eatingTimeout && performance.now() - time > 1500;
    }

    async reEquipOldItem(currentItem: Item) {
        if (
            this.lastItem &&
            this.lastItem?.item?.name !== currentItem?.name &&
            this.bot.food > this.minHunger &&
            this.bot.health >= this.minHealth
        ) {
            const copyItem = this.bot.inventory.items().find((item) => item?.name === this.lastItem?.item.name);
            if (copyItem) await this.equipCheck(copyItem, this.lastItem?.dest);
        }
    }

    findBestChoices(): Item[] {
        return this.bot.util.inv
            .getAllItems()
            .filter((item) => item?.name in this.foodsByName)
            .filter((item) => !this.bannedFood.includes(item?.name))
            .sort((a, b) => this.foodsByName[b.name][this.priority] - this.foodsByName[a.name][this.priority]);
    }

    // findFoodFromGround(orgEntity: Entity): Item {

    // }

    async equipCheck(item: Item, destination: EquipmentDestination) {
        const requiresConfirmation = this.bot.inventory.requiresConfirmation;
        if (this.ignoreInventoryCheck) this.bot.inventory.requiresConfirmation = false;
        await this.bot.util.inv.customEquip(item, destination);
        // await this.bot.util.builtInsPriority({ group: "inventory", priority: 1 }, this.bot.equip, item, destination);
        this.bot.inventory.requiresConfirmation = requiresConfirmation;
    }

    async eat(useOffHand: boolean = false, foodToEat?: Item | md.Food, equipOldItem: boolean = true): Promise<Error | boolean> {
        const hand = useOffHand ? "off-hand" : "hand";
        if (this.canceled) return Error("Canceled.");
        if (this.isEating) return Error("Already eating");
        this.isEating = true;

        foodToEat = (foodToEat as any)?.slot
            ? (foodToEat as Item)
            : this.bot.util.inv.getAllItems().find((i) => i?.name === foodToEat?.name);
        const orgItem = this.bot.util.inv.getHandWithItem(useOffHand)!;
        const bestChoices = !!foodToEat ? [foodToEat] : this.findBestChoices();
        const bestFood = bestChoices[0];
        let result: Error | boolean;
        if (bestFood) {
            if (orgItem?.name !== bestFood?.name && !(orgItem?.name in this.foodsByName)) this.lastItem = { item: orgItem, dest: hand };
            if (orgItem?.name !== bestFood.name || orgItem?.displayName !== bestFood.displayName) await this.equipCheck(bestFood, hand);
            this.bot.emit("autoEatStarted", bestFood, useOffHand);
            this.bot.deactivateItem();
            this.bot.activateItem(this.useOffHand);

            result = await this.waitForEating(bestFood, useOffHand);
            if (equipOldItem || this.returnToLastItem) await this.reEquipOldItem(bestFood);
        } else {
            result = Error("No found food.");
        }
        this.bot.emit("autoEatStopped", bestFood ?? null, useOffHand);
        this.isEating = false;
        return result;
    }

    async healthCheck() {
        if (!this.enabled || this.isEating || (this.bot.food >= this.minHunger && this.bot.health > this.minHealth)) return;
        // if (this.bot.pathfinder && (this.bot.pathfinder.isMining() || this.bot.pathfinder.isBuilding())) return; //lol they know
        try {
            await this.eat(this.useOffHand);
        } catch (e) {}
    }

    /**
     * TODO: Detect what item is picked up and eat it.
     * @param who Item as Entity picked up from off ground.
     */
    async playerCollectCheck(who: Entity, food: Entity) {
        if (who.username !== this.bot.username || !this.checkOnItemPickup) return;
        // if (this.bot.pathfinder && (this.bot.pathfinder.isMining() || this.bot.pathfinder.isBuilding())) return; //lol they know
        try {
            const pickedUpFood = this.foods[(food.metadata.find((meta) => typeof meta === "object") as any).itemId];
            if (pickedUpFood) {
                //Wait for item to be registered into inventory.
                await this.bot.waitForTicks(1);
                await this.eat(this.useOffHand, pickedUpFood, true);
            }
        } catch (e) {}
    }
}
