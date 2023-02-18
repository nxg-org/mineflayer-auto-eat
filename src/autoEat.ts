import { Bot, EquipmentDestination } from "mineflayer";
import { performance } from "perf_hooks";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import { promisify } from "util";
import md from "minecraft-data";
const sleep = promisify(setTimeout);

export interface IAutoEatOptions {
    priority: "foodPoints" | "saturation";
    minHunger: number;
    minHealth: number;
    bannedFood: string[];
    ignoreInventoryCheck: boolean;
    returnToLastItem: boolean;
    eatUntilFull: boolean;
    useOffHand: boolean;
    checkOnItemPickup: boolean;
    eatingTimeout: number;
}


export class AutoEat {
    public enabled: boolean = true;
    public isEating: boolean = true;

    public options: IAutoEatOptions;
    private foods: { [id: number]: md.Food };
    private foodsByName: { [name: string]: md.Food };
    private lastItem?: { item: Item; dest: "hand" | "off-hand" };
    private canceled: boolean = false;

    constructor(private bot: Bot, options?: Partial<IAutoEatOptions>) {
        this.foodsByName = bot.registry.foodsByName;
        this.foods = bot.registry.foods;

        this.options = Object.assign({
            priority: "foodPoints",
            minHunger: 14,
            minHealth: 14,
            bannedFood: [],
            ignoreInventoryCheck: false,
            returnToLastItem: true,
            eatUntilFull: false,
            useOffHand: false,
            checkOnItemPickup: true,
            eatingTimeout: 3000
        }, options);

        this.bot.on("physicsTick", this.healthCheck);
        this.bot.on("playerCollect", this.playerCollectCheck);
        this.bot.on("spawn", () => {
            this.isEating = false;
        });
        this.bot.on("death", () => {
            this.isEating = false;
        });

        this.bot._client.on("entity_status", (packet: any) => {
            if (packet.entityId === this.bot.entity.id && packet.entityStatus === 9 && this.isEating) {
                this.isEating = false;
            }
        });
    }


    public setOptions(options: Partial<IAutoEatOptions>) {
        return Object.assign(this.options, options);
    }

    public enable() {
        this.enabled = true;
    }

    public disable() {
        this.enabled = false;
    }


    public cancelEat() {
        this.isEating = false;
        this.canceled = true;
    }

    public resumeEat() {
        if (this.canceled) {
            this.isEating = false;
            this.canceled = false;
        }
    }

    public async waitForEating(bestFood: Item, offhand?: boolean): Promise<boolean> {
        const time = performance.now();
        while (
            this.isEating &&
            performance.now() - time < this.options.eatingTimeout &&
            this.bot.util.inv.getHandWithItem(offhand)?.name === bestFood.name
        ) {
            await sleep(0);
        }

        return performance.now() - time < this.options.eatingTimeout && performance.now() - time > 1500;
    }

    private async reEquipOldItem(currentItem: Item) {
        if (
            this.lastItem &&
            this.lastItem?.item?.name !== currentItem?.name &&
            this.bot.food > this.options.minHunger &&
            this.bot.health >= this.options.minHealth
        ) {
            
            const copyItem = this.bot.util.inv.getAllItems().find((item) => 
                item.name === this.lastItem?.item?.name 
                && item.nbt === this.lastItem?.item?.nbt
            );

            if (copyItem) {
                await this.equipCheck(copyItem, this.lastItem?.dest);
            }
        }
    }

    public findBestChoices(): Item[] {
        return this.bot.util.inv
            .getAllItems()
            .filter((item) => item?.name in this.foodsByName)
            .filter((item) => !this.options.bannedFood.includes(item?.name))
            .sort((a, b) => this.foodsByName[b.name][this.options.priority] - this.foodsByName[a.name][this.options.priority]);
    }

    private async equipCheck(item: Item, destination: EquipmentDestination) {
        const requiresConfirmation = this.bot.inventory.requiresConfirmation;
        if (this.options.ignoreInventoryCheck) this.bot.inventory.requiresConfirmation = false;
        await this.bot.util.inv.customEquip(item, destination);
        this.bot.inventory.requiresConfirmation = requiresConfirmation;
    }

    public async eat( foodToEat?: Item | md.Food, useOffHand: boolean = false, equipOldItem: boolean = true): Promise<Error | boolean> {
        const hand = useOffHand ? "off-hand" : "hand";

        if (this.canceled) {
            return Error("Canceled.");
        }

        if (this.isEating) {
            return Error("Already eating");
        }

        this.isEating = true;

        foodToEat = (foodToEat as any)?.slot
            ? (foodToEat as Item)
            : this.bot.util.inv.getAllItems().find((i) => i.name === foodToEat?.name);

        const orgItem = this.bot.util.inv.getHandWithItem(useOffHand)!;
        const bestChoices = !!foodToEat ? [foodToEat] : this.findBestChoices();
        const bestFood = bestChoices[0];

        let result: Error | boolean;

        if (bestFood) {
            if (orgItem?.name !== bestFood?.name && !(orgItem?.name in this.foodsByName)) {
                 this.lastItem = { item: orgItem, dest: hand };
            }

            if (orgItem?.name !== bestFood.name || orgItem?.displayName !== bestFood.displayName) {
                await this.equipCheck(bestFood, hand);
            }

            this.bot.emit("autoEatStarted", bestFood, useOffHand);
            this.bot.deactivateItem();
            this.bot.activateItem(this.options.useOffHand);

            result = await this.waitForEating(bestFood, useOffHand);

            if (equipOldItem || this.options.returnToLastItem) {
                await this.reEquipOldItem(bestFood);
            }
        } else {
            result = Error("No found food.");
        }
        this.bot.emit("autoEatFinished", bestFood ?? null, useOffHand);
        this.isEating = false;
        return result;
    }

    private healthCheck = async () => {
        if (!this.enabled || this.isEating || (this.bot.food >= this.options.minHunger && this.bot.health > this.options.minHealth)) return;
        // if (this.bot.pathfinder && (this.bot.pathfinder.isMining() || this.bot.pathfinder.isBuilding())) return; //lol they know
        try {
            await this.eat(this.options.useOffHand);
        } catch (e) { }
    }

    /**
     * TODO: Detect what item is picked up and eat it.
     * @param who Item as Entity picked up from off ground.
     */
    private playerCollectCheck = async (who: Entity, food: Entity) => {
        if (who.username !== this.bot.username || !this.options.checkOnItemPickup) return;
        // if (this.bot.pathfinder && (this.bot.pathfinder.isMining() || this.bot.pathfinder.isBuilding())) return; //lol they know
        try {
            const pickedUpFood = this.foods[(food.metadata.find((meta) => typeof meta === "object") as any).itemId];
            if (pickedUpFood) {
                //Wait for item to be registered into inventory.
                await this.bot.waitForTicks(1);
                await this.eat(this.options.useOffHand, pickedUpFood, true);
            }
        } catch (e) { }
    }
}
