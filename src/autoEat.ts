import { Bot, EquipmentDestination } from "mineflayer";
import { performance } from "perf_hooks";
import type { Entity } from "prismarine-entity";
import type { Item } from "prismarine-item";
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
  checkOnHealth: boolean;
  checkOnItemPickup: boolean;
  eatingTimeout: number;
}

export class AutoEat {
  public isEating: boolean = false;

  public options: IAutoEatOptions;
  private foods: { [id: number]: md.Food };
  private foodsByName: { [name: string]: md.Food };
  private lastItem?: { item: Item; dest: "hand" | "off-hand" };
  private canceled: boolean = false;

  constructor(private bot: Bot, options: Partial<IAutoEatOptions> = {}) {
    this.foodsByName = bot.registry.foodsByName;
    this.foods = bot.registry.foods;

    this.options = Object.assign(
      {
        priority: "foodPoints",
        minHunger: 14,
        minHealth: 14,
        bannedFood: [],
        ignoreInventoryCheck: false,
        returnToLastItem: true,
        eatUntilFull: false,
        useOffHand: false,
        checkOnHealth: false,
        checkOnItemPickup: false,
        eatingTimeout: 3000,
      },
      options
    );

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

  public enableAuto() {
    this.options.checkOnHealth = true;
    this.options.checkOnItemPickup = true;
  }

  public disableAuto() {
    this.options.checkOnHealth = false;
    this.options.checkOnItemPickup = false;
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

  public async waitForEating(bestFood: Item, offhand: boolean = this.options.useOffHand): Promise<boolean> {
    const time = performance.now();
    while (
      this.isEating &&
      performance.now() - time < this.options.eatingTimeout &&
      this.bot.util.inv.getHandWithItem(offhand)?.name === bestFood.name
    ) {
      await sleep(50);
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
      const copyItem = this.bot.util.inv
        .getAllItems()
        .find((item) => item.name === this.lastItem?.item?.name && item.nbt === this.lastItem?.item?.nbt);

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
      .sort(
        (a, b) => this.foodsByName[b.name][this.options.priority] - this.foodsByName[a.name][this.options.priority]
      );
  }

  public hasFood(): boolean {
    return this.findBestChoices().length > 0;
  }

  private async equipCheck(item: Item, destination: EquipmentDestination) {
    const requiresConfirmation = this.bot.inventory.requiresConfirmation;
    if (this.options.ignoreInventoryCheck) this.bot.inventory.requiresConfirmation = false;
    await this.bot.util.inv.customEquip(item, destination);
    this.bot.inventory.requiresConfirmation = requiresConfirmation;
  }

  public async eat(
    options: { food?: Item | md.Food; offhand?: boolean; equipOldItem?: boolean } = {}
  ): Promise<Error | boolean> {
    if (this.canceled) {
      return Error("Canceled.");
    }

    if (this.isEating) {
      return Error("Already eating");
    }

    this.isEating = true;
    const offhand = options.offhand || this.options.useOffHand || false;
    const equipOldItem = options.equipOldItem || this.options.returnToLastItem || false;
    const hand = offhand ? "off-hand" : "hand";

    let foodToEat: Item | undefined = (options.food as any)?.slot
      ? (options.food as Item)
      : this.bot.util.inv.getAllItems().find((i) => i.name === options.food?.name);

    const orgItem = this.bot.util.inv.getHandWithItem(offhand);
    const bestChoices = !!foodToEat ? [foodToEat] : this.findBestChoices();
    const bestFood = bestChoices[0] ?? null;

    let result: Error | boolean;

    if (bestFood) {
      if (orgItem) {
        if (orgItem.name !== bestFood?.name && !(orgItem!.name in this.foodsByName)) {
          this.lastItem = { item: orgItem!, dest: hand };
        }
      }

      if (orgItem?.name !== bestFood.name || orgItem?.displayName !== bestFood.displayName) {
        await this.equipCheck(bestFood, hand);
      }

      this.bot.emit("autoEatStarted", bestFood, offhand);
      this.bot.deactivateItem();
      this.bot.activateItem(offhand);

      result = await this.waitForEating(bestFood, offhand);

      if (equipOldItem) {
        await this.reEquipOldItem(bestFood);
      }
    } else {
      result = Error("No found food.");
    }
    this.bot.emit("autoEatFinished", bestFood, offhand);
    this.isEating = false;
    return result;
  }

  private healthCheck = async () => {
    if (
      !this.options.checkOnHealth ||
      this.isEating ||
      (this.bot.food >= this.options.minHunger && this.bot.health > this.options.minHealth)
    )
      return;

    await this.eat({ offhand: this.options.useOffHand });
  };

  /**
   * TODO: Detect what item is picked up and eat it.
   * @param who Item as Entity picked up from off ground.
   */
  private playerCollectCheck = async (who: Entity, food: Entity) => {
    if (who.username !== this.bot.username || !this.options.checkOnItemPickup) return;
    if (this.isEating) return;

    const itemId = (food.metadata.find((meta) => typeof meta === "object") as any).itemId;
    if (!itemId) return;
    const pickedUpFood = this.foods[itemId];
    if (pickedUpFood) {
      //Wait for item to be registered into inventory.
      await this.bot.waitForTicks(1);
      await this.eat({ food: pickedUpFood, offhand: this.options.useOffHand, equipOldItem: true });
    }
  };
}
